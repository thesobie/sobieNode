const authService = require('../services/authService');
const jwtService = require('../services/jwtService');
const { catchAsync } = require('../utils/catchAsync');

// @desc    Login user with email/password
// @route   POST /api/auth/login
// @access  Public
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  const result = await authService.login(email, password);
  
  // Set secure cookies
  jwtService.setAuthCookies(res, result.tokens);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      tokens: result.tokens
    }
  });
});

// @desc    Request magic link for passwordless login
// @route   POST /api/auth/magic-link
// @access  Public
const requestMagicLink = catchAsync(async (req, res) => {
  const { email, method = 'email' } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email address'
    });
  }

  const result = await authService.requestMagicLink(email, method);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      method: result.method,
      expiresIn: result.expiresIn
    }
  });
});

// @desc    Login with magic link token
// @route   POST /api/auth/magic-login
// @access  Public
const magicLogin = catchAsync(async (req, res) => {
  // Token can come from either body (POST) or query (GET)
  const { token } = req.body.token ? req.body : req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Magic link token is required'
    });
  }

  const result = await authService.loginWithMagicLink(token);
  
  // Set secure cookies
  jwtService.setAuthCookies(res, result.tokens);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      tokens: result.tokens
    }
  });
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  
  // Set secure cookies for immediate login
  jwtService.setAuthCookies(res, result.tokens);
  
  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      tokens: result.tokens,
      emailVerificationSent: result.emailVerificationSent
    }
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = catchAsync(async (req, res) => {
  let refreshToken = req.body.refreshToken;
  
  // Try to get refresh token from cookies if not in body
  if (!refreshToken) {
    refreshToken = req.cookies.refreshToken;
  }

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  const result = await authService.refreshToken(refreshToken);
  
  // Update access token cookie
  res.cookie('accessToken', result.accessToken, {
    ...jwtService.getSecureCookieOptions(result.accessTokenExpiry - Date.now())
  });
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      accessToken: result.accessToken,
      accessTokenExpiry: result.accessTokenExpiry
    }
  });
});

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = catchAsync(async (req, res) => {
  // Token can come from either body (POST) or query (GET)
  const { token } = req.body.token ? req.body : req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  const result = await authService.verifyEmail(token);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      user: result.user
    }
  });
});

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Public
const resendEmailVerification = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required'
    });
  }

  const result = await authService.resendEmailVerification(email);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required'
    });
  }

  const result = await authService.requestPasswordReset(email);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      expiresIn: result.expiresIn
    }
  });
});

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = catchAsync(async (req, res) => {
  // For GET requests (email links), token comes from query, no password yet
  if (req.method === 'GET') {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>SOBIE - Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; margin: 50px;">
          <h2>Error: Reset token is required</h2>
          <p>This link appears to be invalid or incomplete.</p>
        </body>
        </html>
      `);
    }
    
    // Return a simple HTML form for password reset
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SOBIE - Reset Password</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 400px; 
            margin: 50px auto; 
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h2 { color: #333; text-align: center; margin-bottom: 20px; }
          .requirements {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
          }
          .requirements p {
            margin: 0 0 10px 0;
            font-weight: bold;
            color: #495057;
          }
          .requirements ul {
            margin: 0;
            padding-left: 20px;
          }
          .requirements li {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 5px;
          }
          input { 
            width: 100%; 
            padding: 12px; 
            margin: 10px 0; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            box-sizing: border-box;
          }
          button { 
            background: #007cba; 
            color: white; 
            padding: 12px 20px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            width: 100%;
            font-size: 16px;
          }
          button:hover { background: #005a8b; }
          .message { text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reset Your Password</h2>
          <div class="requirements">
            <p><strong>Password Requirements:</strong></p>
            <ul>
              <li>At least 8 characters</li>
              <li>1 uppercase letter (A-Z)</li>
              <li>1 lowercase letter (a-z)</li>
              <li>1 number (0-9)</li>
              <li>1 special character (@$!%*?&)</li>
            </ul>
          </div>
          <form id="resetForm">
            <input type="hidden" id="token" value="${token}">
            <input type="password" id="password" placeholder="Enter your new password" required minlength="8" 
                   pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
                   title="Password must contain at least 8 characters with: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)">
            <button type="submit">Reset Password</button>
          </form>
          <div id="message" class="message"></div>
        </div>
        
        <script>
          document.getElementById('resetForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const token = document.getElementById('token').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            
            // Show loading message
            messageDiv.innerHTML = '<p style="color: blue;">⏳ Resetting password...</p>';
            
            try {
              const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password })
              });
              
              const result = await response.json();
              
              if (result.success) {
                messageDiv.innerHTML = '<p style="color: green;">✅ Password reset successful! You can now log in with your new password.</p>';
                document.getElementById('resetForm').style.display = 'none';
              } else {
                messageDiv.innerHTML = '<p style="color: red;">❌ ' + (result.message || 'Password reset failed') + '</p>';
              }
            } catch (error) {
              console.error('Reset password error:', error);
              messageDiv.innerHTML = '<p style="color: red;">❌ An error occurred. Please try again. If the problem persists, please contact support.</p>';
            }
          });
        </script>
      </body>
      </html>
    `);
  }

  // For POST requests, handle the actual password reset
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Reset token and new password are required'
    });
  }

  try {
    const result = await authService.resetPassword(token, password);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed'
    });
  }
});

// @desc    Change password (authenticated user)
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  const result = await authService.changePassword(req.user._id, currentPassword, newPassword);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = catchAsync(async (req, res) => {
  // Clear authentication cookies
  jwtService.clearAuthCookies(res);
  
  const result = await authService.logout();
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user.toJSON()
    }
  });
});

// @desc    Validate current session
// @route   GET /api/auth/validate
// @access  Public
const validateSession = catchAsync(async (req, res) => {
  let token = jwtService.extractTokenFromHeader(req.header('Authorization'));
  
  if (!token) {
    token = jwtService.extractTokenFromCookie(req.cookies);
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
      valid: false
    });
  }

  const result = await authService.validateSession(token);
  
  if (!result.valid) {
    return res.status(401).json({
      success: false,
      message: result.reason,
      valid: false
    });
  }

  res.status(200).json({
    success: true,
    valid: true,
    data: {
      user: result.user,
      tokenInfo: {
        expiresAt: result.decoded.exp * 1000,
        issuedAt: result.decoded.iat * 1000,
        timeUntilExpiry: jwtService.getTimeUntilExpiry(token)
      }
    }
  });
});

module.exports = {
  login,
  requestMagicLink,
  magicLogin,
  register,
  refreshToken,
  verifyEmail,
  resendEmailVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  getMe,
  validateSession
};
