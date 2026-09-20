const express = require('express');
const router = express.Router();
const {
  register,
  registerStaff,
  login,
  getProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Staff registration route (Protected by adminKey in body/header or Admin JWT token)
router.post('/register-staff', (req, res, next) => {
  // Check if Bearer token is provided
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, () => registerStaff(req, res, next));
  }
  // Otherwise pass through to check adminKey inside controller
  return registerStaff(req, res, next);
});

// Authenticated route
router.get('/profile', protect, getProfile);

module.exports = router;
