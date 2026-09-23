/**
 * Role-Based Access Control Middleware
 * Restricts route access to specified user roles.
 * Must be used after auth middleware which attaches req.user.
 *
 * @param  {...string} allowedRoles - List of allowed roles (e.g., 'customer', 'pharmacist', 'admin')
 * @returns {Function} Express middleware
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking role permissions',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: insufficient permissions. Allowed role(s): [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`,
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
