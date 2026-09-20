const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Public route to get all medicines
router.get('/', getMedicines);

// Expiring medicines route (Pharmacist & Admin)
router.get('/expiring', protect, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

// Get single medicine
router.get('/:id', getMedicineById);

// Create medicine (Pharmacist & Admin)
router.post('/', protect, authorizeRoles('pharmacist', 'admin'), createMedicine);

// Update medicine (Pharmacist & Admin)
router.put('/:id', protect, authorizeRoles('pharmacist', 'admin'), updateMedicine);

// Delete medicine (Admin Only)
router.delete('/:id', protect, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
