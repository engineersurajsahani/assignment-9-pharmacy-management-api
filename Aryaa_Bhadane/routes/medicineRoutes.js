const express = require('express');
const router = express.Router();

const {
  getAllMedicines,
  getMedicineById,
  getExpiringMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');

const authenticate = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Public catalog search & browse
router.get('/', getAllMedicines);

// Pharmacist & Admin expiring drugs query (defined before /:id to prevent route shadowing)
router.get(
  '/expiring',
  authenticate,
  authorizeRoles('pharmacist', 'admin'),
  getExpiringMedicines
);

// Public single medicine lookup
router.get('/:id', getMedicineById);

// Pharmacist & Admin add new medicine
router.post(
  '/',
  authenticate,
  authorizeRoles('pharmacist', 'admin'),
  createMedicine
);

// Pharmacist & Admin update medicine stock / pricing
router.put(
  '/:id',
  authenticate,
  authorizeRoles('pharmacist', 'admin'),
  updateMedicine
);

// Admin ONLY medicine deletion
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('admin'),
  deleteMedicine
);

module.exports = router;
