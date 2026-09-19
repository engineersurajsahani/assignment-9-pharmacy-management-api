const roleGuard = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient role permissions'
      });
    }
    next();
  };
};

module.exports = roleGuard;
