const express = require('express');
const { placeOrder, getMyOrders, getAllOrders, updateOrderStatus } = require('../controllers/orderController');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

// Customer only
router.post('/', auth, authorizeRoles('Customer'), placeOrder);
router.get('/my-orders', auth, authorizeRoles('Customer'), getMyOrders);

// Staff only (Admin, Pharmacist)
router.get('/', auth, authorizeRoles('Pharmacist', 'Admin'), getAllOrders);
router.patch('/:id/status', auth, authorizeRoles('Pharmacist', 'Admin'), updateOrderStatus);

module.exports = router;
