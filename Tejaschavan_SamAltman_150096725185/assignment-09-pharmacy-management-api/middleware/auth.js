const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: No Bearer token provided in Authorization header',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Token is missing',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        role: decoded.role,
      };
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed: Token has expired',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Invalid token',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Internal server error during authentication: ${error.message}`,
    });
  }
};

module.exports = auth;
