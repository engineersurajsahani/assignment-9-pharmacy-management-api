const express = require('express');
const router = express.Router();
const {
  getExpiringMedicines,
  getLowStockMedicines
} = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Reports routes accessible by Pharmacist & Admin
router.get('/expiring-soon', protect, authorizeRoles('Pharmacist', 'Admin'), getExpiringMedicines);
router.get('/low-stock', protect, authorizeRoles('Pharmacist', 'Admin'), getLowStockMedicines);

module.exports = router;
