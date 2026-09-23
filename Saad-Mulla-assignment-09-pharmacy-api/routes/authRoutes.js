const express = require('express');
const router = express.Router();
const { registerCustomer, registerStaff, login, getProfile } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

router.post('/register', registerCustomer);
router.post('/register-staff', registerStaff);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);

module.exports = router;