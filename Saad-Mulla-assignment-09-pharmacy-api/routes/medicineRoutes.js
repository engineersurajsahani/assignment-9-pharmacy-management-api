const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');
const {
  getMedicines,
  getExpiringSoon,
  addMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');

router.get('/', getMedicines);
router.get('/expiring', authenticateToken, authorizeRoles('pharmacist', 'admin'), getExpiringSoon);

router.post('/', authenticateToken, authorizeRoles('pharmacist', 'admin'), addMedicine);
router.put('/:id', authenticateToken, authorizeRoles('pharmacist', 'admin'), updateMedicine);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteMedicine);

module.exports = router;