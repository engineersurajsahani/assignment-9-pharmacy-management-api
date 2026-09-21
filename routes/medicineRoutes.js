const express = require('express');

const {
  getMedicines,
  getExpiringMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');

const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

// Public medicine catalog
router.get('/', getMedicines);

// Pharmacist/Admin - expiring medicines
router.get(
  '/expiring',
  auth,
  authorizeRoles('pharmacist', 'admin'),
  getExpiringMedicines
);

// Pharmacist/Admin - add medicine
router.post(
  '/',
  auth,
  authorizeRoles('pharmacist', 'admin'),
  createMedicine
);

// Pharmacist/Admin - update medicine
router.put(
  '/:id',
  auth,
  authorizeRoles('pharmacist', 'admin'),
  updateMedicine
);

// Admin only - delete medicine
router.delete(
  '/:id',
  auth,
  authorizeRoles('admin'),
  deleteMedicine
);

module.exports = router;