// Simple authentication middleware
// In a real application, you would verify JWT tokens here

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }
  
  try {
    // In a real app, verify JWT token here
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    
    // For demo purposes, just check if token exists
    if (token === 'fake-jwt-token-here') {
      req.user = { id: 1, email: 'admin@example.com' };
      next();
    } else {
      throw new Error('Invalid token');
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

module.exports = { authMiddleware };
