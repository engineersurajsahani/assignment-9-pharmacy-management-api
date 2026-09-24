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

// Customer routes
router.post('/', protect, authorizeRoles('customer'), createOrder);
router.get('/my-orders', protect, authorizeRoles('customer'), getMyOrders);

// Staff routes (Pharmacist & Admin)
router.get('/', protect, authorizeRoles('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', protect, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;
