const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.get('/', medicineController.getMedicines); // Public browse
router.get('/expiring', auth, roleGuard('Admin', 'Pharmacist'), medicineController.getExpiringMedicines);
router.post('/', auth, roleGuard('Admin', 'Pharmacist'), medicineController.addMedicine);
router.put('/:id', auth, roleGuard('Admin', 'Pharmacist'), medicineController.updateMedicine);
router.delete('/:id', auth, roleGuard('Admin'), medicineController.deleteMedicine);

module.exports = router;
