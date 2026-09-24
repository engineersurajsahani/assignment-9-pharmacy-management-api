const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getExpiringMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Expiring medicines aggregation (Pharmacist / Admin) - defined before /:id route
router.get('/expiring', protect, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

// Public catalogue browsing
router.get('/', getMedicines);
router.get('/:id', getMedicineById);

// Staff-protected inventory management
router.post('/', protect, authorizeRoles('pharmacist', 'admin'), createMedicine);
router.put('/:id', protect, authorizeRoles('pharmacist', 'admin'), updateMedicine);

// Admin-only drug removal
router.delete('/:id', protect, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
