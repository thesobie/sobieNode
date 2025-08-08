const jwtService = require('../services/jwtService');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');

// Authentication middleware - verifies JWT tokens
const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  // Try to get token from Authorization header first, then from cookies
  const authHeader = req.header('Authorization');
  if (authHeader) {
    token = jwtService.extractTokenFromHeader(authHeader);
  } else {
    token = jwtService.extractTokenFromCookie(req.cookies);
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify the access token
    const decoded = jwtService.verifyAccessToken(token);
    
    // Get fresh user data from database to ensure account is still active
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found or inactive.',
        code: 'USER_INACTIVE'
      });
    }

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to security reasons.',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Attach user to request object
    req.user = user;
    req.tokenPayload = decoded;
    
    next();
  } catch (error) {
    if (error.message === 'Access token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      code: 'INVALID_TOKEN'
    });
  }
});

// Optional authentication middleware - doesn't require token but adds user if present
const optionalAuthMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  // Try to get token from Authorization header first, then from cookies
  const authHeader = req.header('Authorization');
  if (authHeader) {
    token = jwtService.extractTokenFromHeader(authHeader);
  } else {
    token = jwtService.extractTokenFromCookie(req.cookies);
  }

  if (token) {
    try {
      const decoded = jwtService.verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.tokenPayload = decoded;
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
});

// Role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
        code: 'INSUFFICIENT_PRIVILEGES',
        userRoles,
        requiredRoles: roles
      });
    }

    next();
  };
};

// Email verification requirement middleware
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required.',
      code: 'EMAIL_NOT_VERIFIED',
      hint: 'Please check your email and click the verification link.'
    });
  }

  next();
};

// Admin-only middleware
const requireAdmin = requireRole('admin');

// Editor or admin middleware
const requireEditor = requireRole('admin', 'editor');

// Conference chairperson, admin, or editor middleware
const requireConferenceRole = requireRole('admin', 'editor', 'conference-chairperson');

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireEmailVerification,
  requireAdmin,
  requireEditor,
  requireConferenceRole
};
