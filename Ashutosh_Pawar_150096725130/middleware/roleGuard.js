const authorizeRoles = (...allowedRoles) => {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({ message: "Please login first!" });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({
        message: `Forbidden: only ${allowedRoles.join(" or ")} can do this!`,
      });
    }

    next();
  };
};

const isStaff = authorizeRoles("pharmacist", "admin");
const isAdmin = authorizeRoles("admin");
const isCustomer = authorizeRoles("customer");

module.exports = { authorizeRoles, isStaff, isAdmin, isCustomer };
