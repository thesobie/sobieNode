const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTService {
  constructor(config = null) {
    // Allow dependency injection for testing, otherwise load config
    if (!config) {
      config = require('../config/environment');
    }
    
    this.secretKey = config.jwt.secret;
    this.refreshSecretKey = config.jwt.refreshSecret;
    this.tokenExpiry = config.jwt.expiresIn;
    this.refreshTokenExpiry = config.jwt.refreshExpiresIn;
    
    if (!this.secretKey) {
      throw new Error('JWT secret is required in configuration');
    }
  }

  // Generate access token
  generateAccessToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      roles: user.roles,
      primaryRole: user.primaryRole,
      isEmailVerified: user.isEmailVerified,
      type: 'access'
    };

    return jwt.sign(payload, this.secretKey, {
      expiresIn: this.tokenExpiry,
      issuer: 'sobie-platform',
      audience: 'sobie-users'
    });
  }

  // Generate refresh token
  generateRefreshToken(user) {
    if (!this.refreshSecretKey) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required for refresh tokens');
    }

    const payload = {
      id: user._id,
      email: user.email,
      type: 'refresh',
      tokenId: crypto.randomBytes(16).toString('hex') // Unique ID for this refresh token
    };

    return jwt.sign(payload, this.refreshSecretKey, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'sobie-platform',
      audience: 'sobie-users'
    });
  }

  // Generate both access and refresh tokens
  generateTokenPair(user) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      accessTokenExpiry: this.getTokenExpiry(this.tokenExpiry),
      refreshTokenExpiry: this.getTokenExpiry(this.refreshTokenExpiry)
    };
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        issuer: 'sobie-platform',
        audience: 'sobie-users'
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      if (!this.refreshSecretKey) {
        throw new Error('Refresh tokens not configured');
      }

      const decoded = jwt.verify(token, this.refreshSecretKey, {
        issuer: 'sobie-platform',
        audience: 'sobie-users'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Extract token from cookie
  extractTokenFromCookie(cookies, cookieName = 'accessToken') {
    return cookies ? cookies[cookieName] : null;
  }

  // Get token expiry time in milliseconds from now
  getTokenExpiry(expiry) {
    const now = Date.now();
    
    if (typeof expiry === 'string') {
      // Parse string like '15m', '7d', '1h'
      const timeValue = parseInt(expiry.slice(0, -1));
      const timeUnit = expiry.slice(-1);
      
      const multipliers = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
      };
      
      const multiplier = multipliers[timeUnit];
      if (!multiplier) {
        throw new Error(`Invalid time unit: ${timeUnit}`);
      }
      
      return now + (timeValue * multiplier);
    }
    
    if (typeof expiry === 'number') {
      // Assume seconds
      return now + (expiry * 1000);
    }
    
    throw new Error('Invalid expiry format');
  }

  // Decode token without verification (useful for extracting expired token data)
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  // Check if token is expired
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      return decoded.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  }

  // Get time until token expires (in milliseconds)
  getTimeUntilExpiry(token) {
    try {
      const decoded = this.decodeToken(token);
      return (decoded.exp * 1000) - Date.now();
    } catch (error) {
      return 0;
    }
  }

  // Generate secure cookie options
  getSecureCookieOptions(maxAge = null) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge || this.getTokenExpiry(this.refreshTokenExpiry) - Date.now(),
      domain: process.env.COOKIE_DOMAIN || undefined
    };
  }

  // Clear authentication cookies
  clearAuthCookies(res) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: process.env.COOKIE_DOMAIN || undefined
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('isAuthenticated', { ...cookieOptions, httpOnly: false });
  }

  // Set authentication cookies
  setAuthCookies(res, tokens) {
    const accessTokenMaxAge = this.getTimeUntilExpiry(tokens.accessToken);
    const refreshTokenMaxAge = this.getTimeUntilExpiry(tokens.refreshToken);

    // Set access token cookie
    res.cookie('accessToken', tokens.accessToken, {
      ...this.getSecureCookieOptions(accessTokenMaxAge)
    });

    // Set refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      ...this.getSecureCookieOptions(refreshTokenMaxAge)
    });

    // Set a non-httpOnly cookie for client-side auth state checking
    res.cookie('isAuthenticated', 'true', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshTokenMaxAge,
      domain: process.env.COOKIE_DOMAIN || undefined
    });
  }
}

module.exports = new JWTService();
