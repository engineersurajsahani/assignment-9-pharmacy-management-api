const express = require('express');
const router = express.Router();
const {
  getAllMedicines,
  getMedicineById,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// Public route: Browse medicine catalog
router.get('/', getAllMedicines);

// Pharmacist / Admin route: Expiring medicines list (Must be placed before /:id)
router.get('/expiring', authenticateToken, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

// Public route: Get single medicine
router.get('/:id', getMedicineById);

// Pharmacist / Admin routes: Add & Update medicine
router.post('/', authenticateToken, authorizeRoles('pharmacist', 'admin'), addMedicine);
router.put('/:id', authenticateToken, authorizeRoles('pharmacist', 'admin'), updateMedicine);

// Admin Only route: Delete medicine
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
