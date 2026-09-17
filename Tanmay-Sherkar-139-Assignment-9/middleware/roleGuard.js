const { AppError } = require('../utils/errors');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden. Requires one of these roles: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }
    next();
  };
};

module.exports = authorizeRoles;