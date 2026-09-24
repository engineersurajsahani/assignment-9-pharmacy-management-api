const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Customer-only endpoints
router.post('/', protect, authorizeRoles('customer'), createOrder);
router.get('/my-orders', protect, authorizeRoles('customer'), getMyOrders);

// Staff-only endpoints (Pharmacist / Admin)
router.get('/', protect, authorizeRoles('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', protect, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

// View order details (Customer can view own order, Staff can view any)
router.get('/:id', protect, authorizeRoles('customer', 'pharmacist', 'admin'), getOrderById);

module.exports = router;
