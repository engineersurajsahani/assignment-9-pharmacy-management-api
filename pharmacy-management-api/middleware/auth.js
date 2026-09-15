const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer JWT token on the Authorization header and attaches
 * the decoded payload ({ id, email, role }) to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Provide a Bearer token in the Authorization header.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token expired, please log in again'
        : 'Invalid or malformed token';
    return res.status(401).json({ success: false, message });
  }
}

module.exports = authenticate;
