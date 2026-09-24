const express = require('express');
const { getMedicines, getExpiringMedicines, addMedicine, updateMedicine, deleteMedicine } = require('../controllers/medicineController');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

router.get('/', getMedicines);

// The order matters here. /expiring must be before /:id otherwise 'expiring' will be taken as an ID.
router.get('/expiring', auth, authorizeRoles('Pharmacist', 'Admin'), getExpiringMedicines);

router.post('/', auth, authorizeRoles('Pharmacist', 'Admin'), addMedicine);
router.put('/:id', auth, authorizeRoles('Pharmacist', 'Admin'), updateMedicine);
router.delete('/:id', auth, authorizeRoles('Admin'), deleteMedicine);

module.exports = router;
