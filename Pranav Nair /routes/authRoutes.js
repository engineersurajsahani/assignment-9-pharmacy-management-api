const express = require('express');
const router = express.Router();
const { register, registerStaff, login, getProfile } = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/register-staff
router.post('/register-staff', registerStaff);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile
router.get('/profile', auth, getProfile);

module.exports = router;
