const express = require('express');
const router = express.Router();

const {
  registerCustomer,
  registerStaff,
  login,
  getProfile
} = require('../controllers/authController');

const authenticate = require('../middleware/auth');

// Public authentication routes
router.post('/register', registerCustomer);
router.post('/register-staff', registerStaff);
router.post('/login', login);

// Authenticated user profile
router.get('/profile', authenticate, getProfile);

module.exports = router;
