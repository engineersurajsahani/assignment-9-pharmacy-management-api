const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');
const auth = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Customer order routes
router.post('/', auth, authorizeRoles('customer'), createOrder);
router.get('/my-orders', auth, authorizeRoles('customer'), getMyOrders);

// Staff order routes (Pharmacist & Admin)
router.get('/', auth, authorizeRoles('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', auth, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

// Get specific order by ID (Customer can see own; Pharmacist & Admin can see any)
router.get('/:id', auth, getOrderById);

module.exports = router;
