/**
 * Middleware to restrict route access by role(s)
 * @param  {...string} roles Allowed roles e.g. ('Admin', 'Pharmacist')
 */
const authorizeRoles = (...roles) => {
  const normalizedAllowedRoles = roles.map(r => r.toLowerCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking authorization roles.'
      });
    }

    const userRole = req.user.role.toLowerCase();

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this route. Requires one of: [${roles.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };
