const express = require('express');

const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');

const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

// Customer - place an order
router.post(
  '/',
  auth,
  authorizeRoles('customer'),
  createOrder
);

// Customer - view their own orders
router.get(
  '/my-orders',
  auth,
  authorizeRoles('customer'),
  getMyOrders
);

// Pharmacist/Admin - view all orders
router.get(
  '/',
  auth,
  authorizeRoles('pharmacist', 'admin'),
  getAllOrders
);

// Pharmacist/Admin - update order status
router.patch(
  '/:id/status',
  auth,
  authorizeRoles('pharmacist', 'admin'),
  updateOrderStatus
);

module.exports = router;