const express = require('express');
const router = express.Router();
const {
  register,
  registerStaff,
  login,
  getProfile,
} = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public auth routes
router.post('/register', register);
router.post('/register-staff', registerStaff);
router.post('/login', login);

// Protected auth routes
router.get('/profile', auth, getProfile);

module.exports = router;
