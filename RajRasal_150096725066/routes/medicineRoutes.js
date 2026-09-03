const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const authenticateJWT = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

// Public catalog routes
router.get('/', medicineController.getAllMedicines);
router.get('/expiring', authenticateJWT, authorizeRoles('Admin', 'Pharmacist'), medicineController.getExpiringMedicines);
router.get('/:id', medicineController.getMedicineById);

// Staff management routes
router.post('/', authenticateJWT, authorizeRoles('Admin', 'Pharmacist'), medicineController.createMedicine);
router.put('/:id', authenticateJWT, authorizeRoles('Admin', 'Pharmacist'), medicineController.updateMedicine);
router.delete('/:id', authenticateJWT, authorizeRoles('Admin'), medicineController.deleteMedicine);

module.exports = router;
