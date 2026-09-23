const express = require('express');
const router = express.Router();

const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');

const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// POST /api/orders — Customer places an order
router.post('/', protect, roleGuard('customer'), placeOrder);

// GET /api/orders/my-orders — Customer views own order history
// NOTE: This must be defined BEFORE /:id to avoid route conflict
router.get('/my-orders', protect, roleGuard('customer'), getMyOrders);

// GET /api/orders — Pharmacist & Admin view all orders
router.get('/', protect, roleGuard('pharmacist', 'admin'), getAllOrders);

// PATCH /api/orders/:id/status — Pharmacist & Admin update order status
router.patch('/:id/status', protect, roleGuard('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;
