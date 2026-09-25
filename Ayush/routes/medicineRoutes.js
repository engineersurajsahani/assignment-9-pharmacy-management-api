const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getExpiringSoon,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

router.get('/', getMedicines);

router.get('/expiring', protect, authorizeRoles('pharmacist', 'admin'), getExpiringSoon);
router.post('/', protect, authorizeRoles('pharmacist', 'admin'), createMedicine);
router.put('/:id', protect, authorizeRoles('pharmacist', 'admin'), updateMedicine);

router.delete('/:id', protect, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
