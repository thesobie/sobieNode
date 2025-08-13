const jwtService = require('../services/jwtService');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// Authentication middleware - verifies JWT tokens
const authMiddleware = catchAsync(async (req, res, next) => {
  let token;

  // Try to get token from Authorization header first, then from cookies
  const authHeader = req.header('Authorization');
  if (authHeader) {
    token = jwtService.extractTokenFromHeader(authHeader);
  } else {
    token = jwtService.extractTokenFromCookie(req.cookies);
  }

  if (!token) {
    logger.warn('Authentication attempt without token', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });
    
    throw AppError.unauthorized('Access denied. No token provided.', 'NO_TOKEN');
  }

  try {
    // Verify the access token
    const decoded = jwtService.verifyAccessToken(token);
    
    // Get fresh user data from database to ensure account is still active
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      logger.warn('Authentication attempt with invalid or inactive user', {
        userId: decoded.id,
        userExists: !!user,
        isActive: user?.isActive,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      throw AppError.unauthorized('Access denied. User not found or inactive.', 'USER_INACTIVE');
    }

    if (user.isLocked) {
      logger.warn('Authentication attempt with locked account', {
        userId: user._id,
        lockUntil: user.lockUntil,
        ip: req.ip
      });
      
      const error = AppError.locked('Account is temporarily locked due to security reasons.', 'ACCOUNT_LOCKED');
      error.lockUntil = user.lockUntil;
      throw error;
    }

    // Attach user to request object
    req.user = user;
    req.tokenPayload = decoded;
    
    logger.debug('User authenticated successfully', {
      userId: user._id,
      email: user.email,
      roles: user.roles
    });
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error.message === 'Access token has expired') {
      logger.info('Token expired during authentication', {
        userId: decoded?.id,
        ip: req.ip
      });
      throw AppError.unauthorized('Access token has expired.', 'TOKEN_EXPIRED');
    }
    
    logger.warn('Invalid token during authentication', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    throw AppError.unauthorized('Invalid token.', 'INVALID_TOKEN');
  }
});

// Optional authentication middleware - doesn't require token but adds user if present
const optionalAuthMiddleware = catchAsync(async (req, res, next) => {
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
        
        logger.debug('Optional authentication successful', {
          userId: user._id,
          email: user.email
        });
      }
    } catch (error) {
      // Silently fail for optional auth but log for monitoring
      logger.debug('Optional authentication failed', {
        error: error.message,
        ip: req.ip
      });
    }
  }

  next();
});

// Role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Authorization attempt without authentication', {
        requiredRoles: roles,
        ip: req.ip,
        url: req.originalUrl
      });
      
      throw AppError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
    }

    // Check both legacy roles and new dual role system
    const userRoles = req.user.roles || [];
    const userAppRoles = req.user.appRoles || [];
    const userSobieRoles = req.user.sobieRoles || [];
    
    // Combine all roles for checking
    const allUserRoles = [...new Set([...userRoles, ...userAppRoles, ...userSobieRoles])];
    
    const hasRequiredRole = roles.some(role => allUserRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Authorization failed - insufficient privileges', {
        userId: req.user._id,
        userRoles,
        userAppRoles,
        userSobieRoles,
        requiredRoles: roles,
        url: req.originalUrl,
        method: req.method
      });
      
      const error = AppError.forbidden(`Access denied. Required role(s): ${roles.join(', ')}`, 'INSUFFICIENT_PRIVILEGES');
      error.userRoles = allUserRoles;
      error.requiredRoles = roles;
      throw error;
    }

    logger.debug('Authorization successful', {
      userId: req.user._id,
      userRoles,
      userAppRoles,
      userSobieRoles,
      requiredRoles: roles,
      url: req.originalUrl
    });

    next();
  };
};

// App role-specific authorization middleware
const requireAppRole = (...appRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
    }

    const userAppRoles = req.user.appRoles || [];
    const hasRequiredRole = appRoles.some(role => userAppRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('App role authorization failed', {
        userId: req.user._id,
        userAppRoles,
        requiredAppRoles: appRoles,
        url: req.originalUrl
      });
      
      throw AppError.forbidden(`Access denied. Required app role(s): ${appRoles.join(', ')}`, 'INSUFFICIENT_APP_PRIVILEGES');
    }

    next();
  };
};

// SOBIE role-specific authorization middleware
const requireSobieRole = (...sobieRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
    }

    const userSobieRoles = req.user.sobieRoles || [];
    const hasRequiredRole = sobieRoles.some(role => userSobieRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('SOBIE role authorization failed', {
        userId: req.user._id,
        userSobieRoles,
        requiredSobieRoles: sobieRoles,
        url: req.originalUrl
      });
      
      throw AppError.forbidden(`Access denied. Required SOBIE role(s): ${sobieRoles.join(', ')}`, 'INSUFFICIENT_SOBIE_PRIVILEGES');
    }

    next();
  };
};

// Email verification requirement middleware
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    throw AppError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
  }

  if (!req.user.isEmailVerified) {
    logger.info('Access attempt with unverified email', {
      userId: req.user._id,
      email: req.user.email,
      url: req.originalUrl
    });
    
    const error = AppError.forbidden('Email verification required.', 'EMAIL_NOT_VERIFIED');
    error.hint = 'Please check your email and click the verification link.';
    throw error;
  }

  next();
};

// Legacy role-based middleware (uses combined role checking)
const requireAdmin = requireRole('admin');
const requireEditor = requireRole('admin', 'editor');
const requireConferenceRole = requireRole('admin', 'editor', 'conference-chairperson');
const requireActivityCoordinator = requireRole('admin', 'activity-coordinator');

// App role-based middleware
const requireAppAdmin = requireAppRole('admin');
const requireAppDeveloper = requireAppRole('developer');

// SOBIE role-based middleware
const requirePresenter = requireSobieRole('presenter');
const requireReviewer = requireSobieRole('reviewer');
const requireVolunteer = requireSobieRole('volunteer');
const requireSessionChair = requireSobieRole('session-chair');
const requireKeynoteSpeaker = requireSobieRole('keynote-speaker');
const requireOfficer = requireSobieRole('officer');
const requireSobieEditor = requireSobieRole('editor');
const requireSobieChairperson = requireSobieRole('conference-chairperson');
const requireSobieActivityCoordinator = requireSobieRole('activity-coordinator');

// Combined role middleware for common scenarios
const requireAnyAdmin = (req, res, next) => {
  const hasAppAdmin = req.user.appRoles && req.user.appRoles.includes('admin');
  const hasLegacyAdmin = req.user.roles && req.user.roles.includes('admin');
  
  if (!hasAppAdmin && !hasLegacyAdmin) {
    throw AppError.forbidden('Admin access required', 'ADMIN_REQUIRED');
  }
  next();
};

const requireAnyEditor = (req, res, next) => {
  const hasAppAdmin = req.user.appRoles && req.user.appRoles.includes('admin');
  const hasSobieEditor = req.user.sobieRoles && req.user.sobieRoles.includes('editor');
  const hasLegacyAdmin = req.user.roles && req.user.roles.includes('admin');
  const hasLegacyEditor = req.user.roles && req.user.roles.includes('editor');
  
  if (!hasAppAdmin && !hasSobieEditor && !hasLegacyAdmin && !hasLegacyEditor) {
    throw AppError.forbidden('Editor access required', 'EDITOR_REQUIRED');
  }
  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireEmailVerification,
  
  // Role checking middleware
  requireRole,
  requireAppRole,
  requireSobieRole,
  
  // Legacy role middleware (backward compatibility)
  requireAdmin,
  requireEditor,
  requireConferenceRole,
  requireActivityCoordinator,
  
  // App role middleware
  requireAppAdmin,
  requireAppDeveloper,
  
  // SOBIE role middleware
  requirePresenter,
  requireReviewer,
  requireVolunteer,
  requireSessionChair,
  requireKeynoteSpeaker,
  requireOfficer,
  requireSobieEditor,
  requireSobieChairperson,
  requireSobieActivityCoordinator,
  
  // Combined role middleware
  requireAnyAdmin,
  requireAnyEditor
};
