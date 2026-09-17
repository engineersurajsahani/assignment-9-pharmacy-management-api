const express = require('express');
const {
  getMedicines,
  getExpiringMedicines,
  getLowStockMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const protect = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleGuard');

const router = express.Router();

router
  .route('/')
  .get(getMedicines)
  .post(protect, authorizeRoles('pharmacist', 'admin'), createMedicine);
router
  .route('/expiring')
  .get(protect, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);
router
  .route('/low-stock')
  .get(protect, authorizeRoles('pharmacist', 'admin'), getLowStockMedicines);
router
  .route('/:id')
  .put(protect, authorizeRoles('pharmacist', 'admin'), updateMedicine)
  .delete(protect, authorizeRoles('admin'), deleteMedicine);

module.exports = router;