const express = require('express');
const router = express.Router();
const {
  getExpiringSoonReport,
  getLowStockReport,
  getInventorySummary
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Expiring soon report (Pharmacist & Admin)
router.get('/expiring-soon', protect, authorizeRoles('pharmacist', 'admin'), getExpiringSoonReport);

// Low stock report (Pharmacist & Admin)
router.get('/low-stock', protect, authorizeRoles('pharmacist', 'admin'), getLowStockReport);

// Inventory summary report (Pharmacist & Admin)
router.get('/inventory-summary', protect, authorizeRoles('pharmacist', 'admin'), getInventorySummary);

module.exports = router;
