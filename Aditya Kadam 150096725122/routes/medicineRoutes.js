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
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.get('/', getAllMedicines);
router.get('/expiring', authenticate, roleGuard('Pharmacist', 'Admin'), getExpiringMedicines);
router.get('/:id', getMedicineById);
router.post('/', authenticate, roleGuard('Pharmacist', 'Admin'), createMedicine);
router.put('/:id', authenticate, roleGuard('Pharmacist', 'Admin'), updateMedicine);
router.delete('/:id', authenticate, roleGuard('Admin'), deleteMedicine);

module.exports = router;
