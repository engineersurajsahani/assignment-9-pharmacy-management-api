const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token missing',
        });
      }

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret_key'
      );

      // Attach user info to request
      req.user = {
        id: decoded.id || decoded.userId,
        role: decoded.role,
      };

      // Optional check if user still exists in DB
      const userExists = await User.findById(req.user.id).select('-password');
      if (!userExists) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists',
        });
      }

      // Update role from DB to prevent stale permissions
      req.user.role = userExists.role;
      req.user.userDoc = userExists;

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired, please log in again',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token',
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided in Authorization header',
    });
  }
};

module.exports = { protect };
