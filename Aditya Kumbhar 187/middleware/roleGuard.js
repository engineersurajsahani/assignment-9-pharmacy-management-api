const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access forbidden: No role found." });
    }

    const normalizedAllowed = allowedRoles.map((role) => role.toLowerCase());
    const userRole = req.user.role.toLowerCase();

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission for this resource.",
      });
    }

    next();
  };
};

module.exports = roleGuard;
