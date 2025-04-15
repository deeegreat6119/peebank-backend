// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require('../models/Usermodel.js');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'No token, authorization denied' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and attach to request
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'User not found' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      status: 'fail', 
      message: 'Token is not valid' 
    });
  }
};

module.exports = authMiddleware;
