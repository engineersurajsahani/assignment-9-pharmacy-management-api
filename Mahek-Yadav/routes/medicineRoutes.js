const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');
const { getMedicines, getExpiring, addMedicine, updateMedicine, deleteMedicine } = require('../controllers/medicineController');

router.get('/', getMedicines);
router.get('/expiring', auth, authorizeRoles('pharmacist', 'admin'), getExpiring);
router.post('/', auth, authorizeRoles('pharmacist', 'admin'), addMedicine);
router.put('/:id', auth, authorizeRoles('pharmacist', 'admin'), updateMedicine);
router.delete('/:id', auth, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
