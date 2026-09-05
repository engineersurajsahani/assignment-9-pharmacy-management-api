const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  getLowStockMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Public routes
router.get('/', getMedicines);

// Expiring & Low Stock routes (Must precede /:id to avoid route collision)
router.get('/expiring', protect, authorizeRoles('Pharmacist', 'Admin'), getExpiringMedicines);
router.get('/low-stock', protect, authorizeRoles('Pharmacist', 'Admin'), getLowStockMedicines);

// Single medicine lookup
router.get('/:id', getMedicineById);

// Staff operations (Pharmacist & Admin)
router.post('/', protect, authorizeRoles('Pharmacist', 'Admin'), createMedicine);
router.put('/:id', protect, authorizeRoles('Pharmacist', 'Admin'), updateMedicine);

// Admin-only operations
router.delete('/:id', protect, authorizeRoles('Admin'), deleteMedicine);

module.exports = router;
