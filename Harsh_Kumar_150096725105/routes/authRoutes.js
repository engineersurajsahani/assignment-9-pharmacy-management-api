const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.post('/register', authController.register);
router.post('/register-staff', authController.registerStaff); // simplified for this assignment
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);

module.exports = router;
