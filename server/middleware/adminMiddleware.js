const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT token using secret from environment
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET
    );
    
    // Check if it's an admin token
    if (decoded.role === 'admin' && decoded.isAdmin) {
      req.admin = { 
        id: decoded.id, 
        role: decoded.role 
      };
      next();
    } else {
      throw new Error('Invalid admin token');
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Not authorized, invalid token'
    });
  }
};

module.exports = { adminAuth };