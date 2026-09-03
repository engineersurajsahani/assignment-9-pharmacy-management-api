const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateJWT = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/register-staff', authController.registerStaff);
router.post('/login', authController.login);
router.get('/profile', authenticateJWT, authController.getProfile);

module.exports = router;
