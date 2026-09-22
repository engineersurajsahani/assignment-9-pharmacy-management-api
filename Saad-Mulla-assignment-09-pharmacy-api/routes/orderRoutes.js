const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');

router.post('/', authenticateToken, authorizeRoles('customer'), placeOrder);
router.get('/my-orders', authenticateToken, authorizeRoles('customer'), getMyOrders);

router.get('/', authenticateToken, authorizeRoles('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', authenticateToken, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;