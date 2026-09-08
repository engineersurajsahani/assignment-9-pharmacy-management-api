const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Validates the JWT from the Authorization header (Bearer <token>).
 * Decodes user details (id, role, email) and attaches to req.user for downstream handlers.
 */
const authenticate = (req, res, next) => {
  try {
    let token;

    // Check for Authorization header starting with 'Bearer '
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1].trim();
    }

    // Reject if no token is found
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: No bearer token provided in Authorization header.'
      });
    }

    // Verify token signature and expiration
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({
        success: false,
        message: 'Internal server error: Security key not configured.'
      });
    }

    const decoded = jwt.verify(token, secret);

    // Attach decoded user payload (id, role, email, name) to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Token has expired. Please log in again.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed: Invalid or malformed token.'
    });
  }
};

module.exports = authenticate;
