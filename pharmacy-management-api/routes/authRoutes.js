const express = require('express');
const router = express.Router();
const { register, registerStaff, login, getProfile } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

// POST /api/auth/register — public, creates a customer
router.post('/register', register);

// POST /api/auth/register-staff — public, requires adminKey, creates pharmacist/admin
router.post('/register-staff', registerStaff);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile
router.get('/profile', authenticate, getProfile);

module.exports = router;
