const roleGuard = (...allowedRoles) => {
    return (request, response, next) => {
        if (!request.user || !request.user.role) {
            return response.status(401).json({ message: "Unauthorized" });
        }

        if (!allowedRoles.includes(request.user.role)) {
            return response.status(403).json({ message: "Forbidden: insufficient permissions" });
        }

        next();
    };
};

module.exports = roleGuard;
