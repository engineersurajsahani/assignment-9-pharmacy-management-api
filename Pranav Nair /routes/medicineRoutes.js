const express = require('express');
const router = express.Router();
const {
  getAllMedicines,
  getExpiringMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

// GET /api/medicines (public)
router.get('/', getAllMedicines);

// GET /api/medicines/expiring (pharmacist / admin)
router.get('/expiring', auth, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

// GET /api/medicines/:id (public)
router.get('/:id', getMedicineById);

// POST /api/medicines (pharmacist / admin)
router.post('/', auth, authorizeRoles('pharmacist', 'admin'), createMedicine);

// PUT /api/medicines/:id (pharmacist / admin)
router.put('/:id', auth, authorizeRoles('pharmacist', 'admin'), updateMedicine);

// DELETE /api/medicines/:id (admin only)
router.delete('/:id', auth, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
