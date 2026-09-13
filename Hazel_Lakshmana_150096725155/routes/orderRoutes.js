const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');
const { placeOrder, myOrders, getAllOrders, updateStatus } = require('../controllers/orderController');

router.post('/', auth, authorizeRoles('customer'), placeOrder);
router.get('/my-orders', auth, authorizeRoles('customer'), myOrders);
router.get('/', auth, authorizeRoles('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', auth, authorizeRoles('pharmacist', 'admin'), updateStatus);

module.exports = router;
