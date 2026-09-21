const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById
} = require('../controllers/orderController');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.post('/', authenticate, roleGuard('Customer'), placeOrder);
router.get('/my-orders', authenticate, roleGuard('Customer'), getMyOrders);
router.get('/', authenticate, roleGuard('Pharmacist', 'Admin'), getAllOrders);
router.get('/:id', authenticate, getOrderById);
router.patch('/:id/status', authenticate, roleGuard('Pharmacist', 'Admin'), updateOrderStatus);

module.exports = router;
