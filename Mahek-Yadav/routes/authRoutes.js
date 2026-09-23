const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { register, registerStaff, login, profile } = require('../controllers/authController');

router.post('/register', register);
router.post('/register-staff', registerStaff);
router.post('/login', login);
router.get('/profile', auth, profile);

module.exports = router;
