const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.post('/', auth, roleGuard('Customer'), orderController.placeOrder);
router.get('/my-orders', auth, roleGuard('Customer'), orderController.getMyOrders);
router.get('/', auth, roleGuard('Admin', 'Pharmacist'), orderController.getAllOrders);
router.patch('/:id/status', auth, roleGuard('Admin', 'Pharmacist'), orderController.updateOrderStatus);

module.exports = router;
