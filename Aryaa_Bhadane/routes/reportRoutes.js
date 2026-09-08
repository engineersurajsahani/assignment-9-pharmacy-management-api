const express = require('express');
const router = express.Router();

const {
  getExpiringSoonReport,
  getLowStockReport
} = require('../controllers/reportController');

const authenticate = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Pharmacist & Admin: Expiring-soon aggregation analytics report
router.get(
  '/expiring-soon',
  authenticate,
  authorizeRoles('pharmacist', 'admin'),
  getExpiringSoonReport
);

// Pharmacist & Admin: Low-stock inventory alert report
router.get(
  '/low-stock',
  authenticate,
  authorizeRoles('pharmacist', 'admin'),
  getLowStockReport
);

module.exports = router;
