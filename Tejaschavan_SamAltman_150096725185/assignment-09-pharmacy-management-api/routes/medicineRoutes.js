const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} = require('../controllers/medicineController');
const auth = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Public route to list medicines (supports search, category, pagination)
router.get('/', getMedicines);

// Expiring medicines report (Pharmacist & Admin only) - placed before /:id route
router.get('/expiring', auth, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

// Public route to view a single medicine
router.get('/:id', getMedicineById);

// Create new medicine (Pharmacist & Admin only)
router.post('/', auth, authorizeRoles('pharmacist', 'admin'), createMedicine);

// Update medicine (Pharmacist & Admin only)
router.put('/:id', auth, authorizeRoles('pharmacist', 'admin'), updateMedicine);

// Delete medicine (Admin only)
router.delete('/:id', auth, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
