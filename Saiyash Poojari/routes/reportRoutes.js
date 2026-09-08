const express = require('express');
const router = express.Router();
const { getExpiringMedicines } = require('../controllers/medicineController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleGuard');

// GET /api/reports/expiring-soon (Pharmacist / Admin)
router.get('/expiring-soon', authenticateToken, authorizeRoles('pharmacist', 'admin'), getExpiringMedicines);

module.exports = router;
