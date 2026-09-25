const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// All order routes require authentication
router.use(protect);

// Customer endpoints
router.post('/', authorizeRoles('Customer'), createOrder);
router.get('/my-orders', authorizeRoles('Customer'), getMyOrders);

// Pharmacist & Admin endpoints
router.get('/', authorizeRoles('Admin', 'Pharmacist'), getAllOrders);
router.patch('/:id/status', authorizeRoles('Admin', 'Pharmacist'), updateOrderStatus);

module.exports = router;
