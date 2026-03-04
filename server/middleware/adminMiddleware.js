const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  try {
    // Simple token verification (you can enhance this with JWT)
    const decoded = Buffer.from(token, 'base64').toString('ascii');
    const [adminId] = decoded.split(':');
    
    if (adminId === 'mca') {
      req.admin = { id: 'mca', role: 'admin' };
      next();
    } else {
      throw new Error('Invalid admin token');
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized, invalid token'
    });
  }
};

module.exports = { adminAuth };