const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.post('/', auth, roleGuard('customer'), orderController.createOrder);
router.get('/my-orders', auth, roleGuard('customer'), orderController.getMyOrders);
router.get('/', auth, roleGuard('pharmacist', 'admin'), orderController.getAllOrders);
router.patch('/:id/status', auth, roleGuard('pharmacist', 'admin'), orderController.updateOrderStatus);

module.exports = router;
