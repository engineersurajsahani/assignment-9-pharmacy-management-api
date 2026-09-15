const express = require('express');
const router = express.Router();
const {
  listMedicines,
  expiringSoon,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const authenticate = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// GET /api/medicines?search=&category= — public
router.get('/', listMedicines);

// GET /api/medicines/expiring — Pharmacist/Admin (must precede /:id)
router.get('/expiring', authenticate, authorizeRoles('pharmacist', 'admin'), expiringSoon);

// GET /api/medicines/:id — public
router.get('/:id', getMedicine);

// POST /api/medicines — Pharmacist/Admin
router.post('/', authenticate, authorizeRoles('pharmacist', 'admin'), createMedicine);

// PUT /api/medicines/:id — Pharmacist/Admin
router.put('/:id', authenticate, authorizeRoles('pharmacist', 'admin'), updateMedicine);

// DELETE /api/medicines/:id — Admin only
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
