const express = require('express');
const {
  register,
  registerStaff,
  login,
  getProfile
} = require('../controllers/authController');
const protect = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/register-staff', registerStaff);
router.post('/login', login);
router.get('/profile', protect, getProfile);

module.exports = router;