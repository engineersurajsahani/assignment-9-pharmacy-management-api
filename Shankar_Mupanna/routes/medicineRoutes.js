const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Public route
router.get('/', getMedicines);

// Restricted routes for Pharmacist & Admin
router.get('/expiring', protect, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);
router.post('/', protect, authorizeRoles('pharmacist', 'admin'), addMedicine);
router.put('/:id', protect, authorizeRoles('pharmacist', 'admin'), updateMedicine);

// Admin-only route
router.delete('/:id', protect, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
