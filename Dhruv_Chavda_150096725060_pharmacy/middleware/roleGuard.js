/**
 * Role-based authorization middleware
 * @param  {...string} allowedRoles - Roles allowed to access the route
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User authentication required'
      });
    }

    // Convert allowed roles and user role to lowercase for case-insensitive matching
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    const userRole = req.user.role.toLowerCase();

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };
