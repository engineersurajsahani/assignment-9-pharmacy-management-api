const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.get('/', medicineController.getMedicines);
router.get('/expiring', auth, roleGuard('pharmacist', 'admin'), medicineController.getExpiringMedicines);
router.get('/:id', medicineController.getMedicineById);
router.post('/', auth, roleGuard('pharmacist', 'admin'), medicineController.createMedicine);
router.put('/:id', auth, roleGuard('pharmacist', 'admin'), medicineController.updateMedicine);
router.delete('/:id', auth, roleGuard('admin'), medicineController.deleteMedicine);

module.exports = router;
