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

// Customer specific order endpoints
router.post('/', protect, authorizeRoles('Customer'), createOrder);
router.get('/my-orders', protect, authorizeRoles('Customer'), getMyOrders);

// Staff order management endpoints
router.get('/', protect, authorizeRoles('Pharmacist', 'Admin'), getAllOrders);
router.patch('/:id/status', protect, authorizeRoles('Pharmacist', 'Admin'), updateOrderStatus);

// Order details endpoint (Customer owner or Staff)
router.get('/:id', protect, getOrderById);

module.exports = router;
