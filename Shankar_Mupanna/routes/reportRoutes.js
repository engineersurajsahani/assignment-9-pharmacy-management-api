const express = require('express');
const router = express.Router();
const { getExpiringMedicines } = require('../controllers/medicineController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// GET /api/reports/expiring-soon
router.get('/expiring-soon', protect, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

module.exports = router;
