const User = require('../models/User');
const userService = require('./userService');
const jwtService = require('./jwtService');
const notificationService = require('./notificationService');
const crypto = require('crypto');

class AuthService {
  // Traditional email/password login
  async login(email, password) {
    // Find user by email (including password field for comparison)
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
    
    if (!user) {
      // Increment login attempts even for non-existent users to prevent enumeration
      await this.logFailedAttempt(email);
      throw new Error('Invalid credentials');
    }

    if (user.isLocked) {
      throw new Error(`Account is locked until ${new Date(user.lockUntil).toLocaleString()}`);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      throw new Error('Invalid credentials');
    }

    // Update last login and clear login attempts
    await user.updateLastLogin();

    // Generate JWT tokens
    const tokens = jwtService.generateTokenPair(user);

    // Remove sensitive data from response
    const userResponse = user.toJSON();

    return {
      user: userResponse,
      tokens,
      message: 'Login successful'
    };
  }

  // Request magic link (passwordless login)
  async requestMagicLink(email, method = 'email') {
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    
    if (!user) {
      // For security, don't reveal if email exists
      return {
        message: 'If an account with this email exists, a magic link has been sent.',
        method
      };
    }

    if (user.isLocked) {
      throw new Error('Account is temporarily locked');
    }

    // Generate magic link token
    const token = user.generateMagicLinkToken();
    await user.save();

    // Send magic link via requested method
    try {
      if (method === 'sms' && user.primaryPhone) {
        await notificationService.sendMagicLinkSMS(
          user.primaryPhone.number, 
          token, 
          user.name.firstName
        );
      } else {
        // Default to email
        await notificationService.sendMagicLinkEmail(
          email, 
          token, 
          user.name.firstName
        );
        method = 'email';
      }
    } catch (error) {
      // Clear the token if sending failed
      user.magicLinkToken = undefined;
      user.magicLinkExpires = undefined;
      await user.save();
      throw new Error('Failed to send magic link');
    }

    return {
      message: `Magic link sent to your ${method}`,
      method,
      expiresIn: '10 minutes'
    };
  }

  // Login via magic link
  async loginWithMagicLink(token) {
    const user = await User.findByMagicLinkToken(token);
    
    if (!user) {
      throw new Error('Invalid or expired magic link');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    if (user.isLocked) {
      throw new Error('Account is temporarily locked');
    }

    // Clear magic link token and update last login
    user.magicLinkToken = undefined;
    user.magicLinkExpires = undefined;
    await user.updateLastLogin();

    // Generate JWT tokens
    const tokens = jwtService.generateTokenPair(user);

    // Remove sensitive data from response
    const userResponse = user.toJSON();

    return {
      user: userResponse,
      tokens,
      message: 'Magic link login successful'
    };
  }

  // Register new user
  async register(userData) {
    const { email, password, name, userType, studentLevel, affiliation } = userData;
    
    // Validate required fields
    if (!email || !name?.firstName || !name?.lastName || !userType || !affiliation?.organization) {
      throw new Error('Please provide all required fields: email, name (first and last), user type, and organization');
    }

    if (userType === 'student' && !studentLevel) {
      throw new Error('Student level is required for student users');
    }

    // For magic link users, password is optional
    if (!password && !userData.magicLinkEnabled) {
      throw new Error('Password is required unless magic link authentication is enabled');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const newUser = await userService.createUser({
      ...userData,
      email: email.toLowerCase()
    });

    // Automatically link any existing submissions with this email
    try {
      await newUser.linkExistingSubmissions();
    } catch (error) {
      console.error('Failed to link existing submissions for new user:', error);
      // Don't fail registration if linking fails
    }

    // Send email verification
    const verificationToken = newUser.generateEmailVerificationToken();
    await newUser.save();

    try {
      await notificationService.sendEmailVerification(
        newUser.email,
        verificationToken,
        newUser.name.firstName
      );
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email sending fails
    }

    // Generate JWT tokens for immediate login
    const tokens = jwtService.generateTokenPair(newUser);

    // Remove sensitive data from response
    const userResponse = newUser.toJSON();

    return {
      user: userResponse,
      tokens,
      message: 'SOBIE Profile creation successful. Please check your email to verify your account.',
      emailVerificationSent: true
    };
  }

  // Refresh access token using refresh token
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    // Get fresh user data
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    if (user.isLocked) {
      throw new Error('Account is locked');
    }

    // Generate new access token
    const newAccessToken = jwtService.generateAccessToken(user);

    return {
      accessToken: newAccessToken,
      accessTokenExpiry: jwtService.getTokenExpiry(process.env.JWT_EXPIRE || '15m'),
      message: 'Token refreshed successfully'
    };
  }

  // Verify email address
  async verifyEmail(token) {
    const user = await User.findByEmailVerificationToken(token);
    
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Mark email as verified and clear token
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return {
      message: 'Email verified successfully',
      user: user.toJSON()
    };
  }

  // Resend email verification
  async resendEmailVerification(email) {
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    
    if (!user) {
      // Don't reveal if email exists
      return {
        message: 'If an account with this email exists and is unverified, a verification email has been sent.'
      };
    }

    if (user.isEmailVerified) {
      return {
        message: 'Email is already verified'
      };
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    await notificationService.sendEmailVerification(
      user.email,
      verificationToken,
      user.name.firstName
    );

    return {
      message: 'Verification email sent'
    };
  }

  // Request password reset
  async requestPasswordReset(email) {
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    
    if (!user) {
      // Don't reveal if email exists
      return {
        message: 'If an account with this email exists, a password reset link has been sent.'
      };
    }

    // Generate reset token (reuse magic link functionality)
    const resetToken = user.generateMagicLinkToken();
    await user.save();

    await notificationService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.name.firstName
    );

    return {
      message: 'Password reset link sent to your email',
      expiresIn: '10 minutes'
    };
  }

  // Reset password using token
  async resetPassword(token, newPassword) {
    const user = await User.findByMagicLinkToken(token);
    
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Validate password using the same criteria as the User model
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check password strength requirements
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPassword.test(newPassword)) {
      throw new Error('Password must contain at least 8 characters with: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)');
    }

    // Update password and clear tokens
    user.password = newPassword;
    user.magicLinkToken = undefined;
    user.magicLinkExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    try {
      await user.save();
    } catch (saveError) {
      // If there's a validation error during save, throw a clearer message
      if (saveError.name === 'ValidationError') {
        const passwordError = saveError.errors.password;
        if (passwordError) {
          throw new Error(passwordError.message);
        }
      }
      throw saveError;
    }

    return {
      message: 'Password reset successful'
    };
  }

  // Change password (for authenticated users)
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    if (newPassword === currentPassword) {
      throw new Error('New password must be different from current password');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return {
      message: 'Password changed successfully'
    };
  }

  // Logout (invalidate tokens on client side)
  async logout() {
    // Since we're using JWT, we don't store tokens server-side
    // Logout is handled by clearing tokens on client side
    // In a more sophisticated setup, you might maintain a blacklist
    
    return {
      message: 'Logged out successfully'
    };
  }

  // Log failed login attempt for non-existent users
  async logFailedAttempt(email) {
    // You might want to implement rate limiting here
    console.log(`Failed login attempt for email: ${email} at ${new Date()}`);
  }

  // Validate session/token
  async validateSession(token) {
    try {
      const decoded = jwtService.verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive || user.isLocked) {
        return { valid: false, reason: 'User invalid or inactive' };
      }

      return {
        valid: true,
        user: user.toJSON(),
        decoded
      };
    } catch (error) {
      return {
        valid: false,
        reason: error.message
      };
    }
  }
}

module.exports = new AuthService();
