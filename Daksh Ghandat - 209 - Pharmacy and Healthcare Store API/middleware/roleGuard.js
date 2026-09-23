// Role guard middleware factory.
// Usage:
//   authorizeRoles("admin")
//   authorizeRoles("admin", "pharmacist")
//   authorizeRoles("customer")
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user is set by the protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login first.",
      });
    }

    // Check whether the logged-in role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };