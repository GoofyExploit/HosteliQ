const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hosteliq_secret');

      // Get user from token
      req.user = await Student.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ error: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

// Admin middleware (for future use)
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied - Admin only' });
  }
};

// Optional auth - doesn't require token but sets user if present
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hosteliq_secret');
      req.user = await Student.findById(decoded.id).select('-password');
    } catch (error) {
      // Token invalid, but continue anyway
      req.user = null;
    }
  }

  next();
};

module.exports = {
  protect,
  admin,
  optionalAuth
};
