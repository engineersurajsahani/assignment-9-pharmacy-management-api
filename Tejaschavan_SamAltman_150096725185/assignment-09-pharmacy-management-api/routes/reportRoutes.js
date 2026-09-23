const express = require('express');
const router = express.Router();
const { getExpiringMedicines } = require('../controllers/medicineController');
const auth = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// GET /api/reports/expiring-soon (Pharmacist & Admin only)
router.get('/expiring-soon', auth, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

module.exports = router;
