const express = require('express');
const router = express.Router();

const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');

const authenticate = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Customer: Place a new order
router.post(
  '/',
  authenticate,
  authorizeRoles('customer'),
  placeOrder
);

// Customer: View personal order history
router.get(
  '/my-orders',
  authenticate,
  authorizeRoles('customer'),
  getMyOrders
);

// Pharmacist & Admin: View all orders across system
router.get(
  '/',
  authenticate,
  authorizeRoles('pharmacist', 'admin'),
  getAllOrders
);

// Authenticated (Customer owner / Pharmacist / Admin): Get single order details
router.get(
  '/:id',
  authenticate,
  getOrderById
);

// Pharmacist & Admin: Update order status (triggers atomic stock deduction)
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('pharmacist', 'admin'),
  updateOrderStatus
);

module.exports = router;
