/**
 * Role-Based Access Control (RBAC) Guard Middleware
 * Restricts route access to users with specified roles.
 *
 * @param {...string} allowedRoles - Allowed user roles (e.g. 'admin', 'pharmacist', 'customer')
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure authentication middleware ran first
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required before role validation.'
      });
    }

    // Check if user's role is within the allowed roles array
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' does not have sufficient permissions. Required role(s): [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles
};
