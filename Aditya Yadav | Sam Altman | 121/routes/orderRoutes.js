const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticateJWT = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

// All order routes require authentication
router.use(authenticateJWT);

// Customer endpoints
router.post('/', authorizeRoles('Customer'), orderController.createOrder);
router.get('/my-orders', authorizeRoles('Customer'), orderController.getMyOrders);

// Staff management endpoints
router.get('/', authorizeRoles('Admin', 'Pharmacist'), orderController.getAllOrders);
router.patch('/:id/status', authorizeRoles('Admin', 'Pharmacist'), orderController.updateOrderStatus);

module.exports = router;
