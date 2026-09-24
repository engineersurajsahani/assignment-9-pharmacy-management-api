const express = require('express');
const { registerCustomer, registerStaff, login, getProfile } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerCustomer);
router.post('/register-staff', registerStaff);
router.post('/login', login);
router.get('/profile', auth, getProfile);

module.exports = router;
