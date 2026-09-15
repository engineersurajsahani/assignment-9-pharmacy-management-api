const express = require('express');
const router = express.Router();
const { placeOrder, myOrders, listOrders, updateOrderStatus } = require('../controllers/orderController');
const authenticate = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// POST /api/orders — Customer only
router.post('/', authenticate, authorizeRoles('customer'), placeOrder);

// GET /api/orders/my-orders — Customer only (must precede /:id-style routes)
router.get('/my-orders', authenticate, authorizeRoles('customer'), myOrders);

// GET /api/orders — Pharmacist/Admin
router.get('/', authenticate, authorizeRoles('pharmacist', 'admin'), listOrders);

// PATCH /api/orders/:id/status — Pharmacist/Admin
router.patch('/:id/status', authenticate, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;
