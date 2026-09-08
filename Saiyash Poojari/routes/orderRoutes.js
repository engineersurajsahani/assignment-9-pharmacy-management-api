const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Customer Only routes: Place order & View order history
router.post('/', authenticateToken, authorizeRoles('customer'), createOrder);
router.get('/my-orders', authenticateToken, authorizeRoles('customer'), getMyOrders);

// Pharmacist / Admin routes: View all orders & Update status
router.get('/', authenticateToken, authorizeRoles('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', authenticateToken, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

// Authenticated route: Get single order details
router.get('/:id', authenticateToken, getOrderById);

module.exports = router;
