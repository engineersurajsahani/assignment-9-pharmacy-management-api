const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

// POST /api/orders (customer only)
router.post('/', auth, authorizeRoles('customer'), placeOrder);

// GET /api/orders/my-orders (customer only)
router.get('/my-orders', auth, authorizeRoles('customer'), getMyOrders);

// GET /api/orders (pharmacist / admin)
router.get('/', auth, authorizeRoles('pharmacist', 'admin'), getAllOrders);

// PATCH /api/orders/:id/status (pharmacist / admin)
router.patch('/:id/status', auth, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;
