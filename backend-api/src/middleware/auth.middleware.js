const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); // Mongoose User model

// It's highly recommended to use an environment variable for the JWT secret in production.
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-and-secret-key-please-change-me-for-production';

const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from the token, excluding password hash
      // The payload in our auth.controller.js uses 'user_id' for user._id
      req.user = await User.findById(decoded.user_id).select('-password_hash');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found for this token' });
      }

      // Check if user still exists (e.g., not deleted after token was issued)
      // This check is somewhat redundant if findById already returns null for non-existent users,
      // but explicitly ensures the user object is populated.
      if (!req.user) {
          return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error('Token verification error:', error.message);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Not authorized, token failed verification (invalid signature or malformed)' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token expired' });
      }
      return res.status(401).json({ message: 'Not authorized, token verification failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      // This should ideally not happen if 'protect' middleware runs first and sets req.user
      return res.status(401).json({ message: 'Not authorized, user role not available' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: User role '${req.user.role}' is not authorized for this resource. Allowed roles: ${roles.join(', ')}` });
    }
    next(); // User has one of the allowed roles
  };
};

module.exports = { protect, authorize };
