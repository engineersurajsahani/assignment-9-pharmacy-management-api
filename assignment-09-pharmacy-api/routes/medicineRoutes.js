const express = require('express');
const router = express.Router();

const {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
} = require('../controllers/medicineController');

const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// GET /api/medicines — All authenticated users can browse
router.get('/', protect, roleGuard('customer', 'pharmacist', 'admin'), getMedicines);

// GET /api/medicines/expiring — Pharmacist & Admin only
// NOTE: This must be defined BEFORE /:id to avoid route conflict
router.get('/expiring', protect, roleGuard('pharmacist', 'admin'), getExpiringMedicines);

// GET /api/medicines/:id — All authenticated users
router.get('/:id', protect, roleGuard('customer', 'pharmacist', 'admin'), getMedicineById);

// POST /api/medicines — Pharmacist & Admin only
router.post('/', protect, roleGuard('pharmacist', 'admin'), addMedicine);

// PUT /api/medicines/:id — Pharmacist & Admin only
router.put('/:id', protect, roleGuard('pharmacist', 'admin'), updateMedicine);

// DELETE /api/medicines/:id — Admin only
router.delete('/:id', protect, roleGuard('admin'), deleteMedicine);

module.exports = router;
