const express = require('express');
const router = express.Router();
const { placeOrder, getMyOrders, getAllOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

router.post('/', protect, authorizeRoles('customer'), placeOrder);
router.get('/my-orders', protect, authorizeRoles('customer'), getMyOrders);
router.get('/', protect, authorizeRoles('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', protect, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;