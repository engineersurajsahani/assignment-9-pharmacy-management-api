const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Place order (Customer only)
router.post('/', protect, authorizeRoles('customer'), createOrder);

// Customer view own orders (Customer only)
router.get('/my-orders', protect, authorizeRoles('customer'), getMyOrders);

// List all orders (Pharmacist & Admin)
router.get('/', protect, authorizeRoles('pharmacist', 'admin'), getAllOrders);

// View specific order details
router.get('/:id', protect, getOrderById);

// Update order status (Pharmacist & Admin)
router.patch('/:id/status', protect, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;
