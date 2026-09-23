/**
 * RBAC Middleware Factory
 *
 * Usage: roleGuard('admin') or roleGuard('pharmacist', 'admin')
 * Must be used AFTER the `protect` middleware (req.user must exist).
 *
 * Returns 403 Forbidden if the authenticated user's role is not in the allowed list.
 */
const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
};

module.exports = { roleGuard };
