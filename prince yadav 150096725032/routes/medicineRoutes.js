const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getExpiringMedicines
} = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Public endpoints
router.get('/', getMedicines);

// Expiring drugs query (Pharmacist / Admin) - placed before /:id to avoid ID conflict
router.get('/expiring', protect, authorizeRoles('Admin', 'Pharmacist'), getExpiringMedicines);

// Single medicine endpoint
router.get('/:id', getMedicineById);

// Add medicine (Pharmacist / Admin)
router.post('/', protect, authorizeRoles('Admin', 'Pharmacist'), createMedicine);

// Update stock/pricing (Pharmacist / Admin)
router.put('/:id', protect, authorizeRoles('Admin', 'Pharmacist'), updateMedicine);

// Delete medicine (Admin Only)
router.delete('/:id', protect, authorizeRoles('Admin'), deleteMedicine);

module.exports = router;
