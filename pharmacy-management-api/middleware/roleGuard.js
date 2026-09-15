/**
 * Generic role-checker factory. Must run after `authenticate` so req.user exists.
 * Usage: authorizeRoles('admin') or authorizeRoles('admin', 'pharmacist')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires role(s) [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
}

module.exports = { authorizeRoles };
