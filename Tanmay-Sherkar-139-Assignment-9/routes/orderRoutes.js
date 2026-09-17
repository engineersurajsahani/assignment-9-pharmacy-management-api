const express = require('express');
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const protect = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

router
  .route('/my-orders')
  .get(protect, authorizeRoles('customer'), getMyOrders);

router
  .route('/')
  .get(protect, authorizeRoles('pharmacist', 'admin'), getAllOrders)
  .post(protect, authorizeRoles('customer'), createOrder);

router
  .route('/:id/status')
  .patch(protect, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;