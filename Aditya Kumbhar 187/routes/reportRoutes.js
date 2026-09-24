const express = require("express");
const router = express.Router();
const { getExpiringMedicines } = require("../controllers/medicineController");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

// Report for medicines expiring soon (Pharmacist / Admin)
router.get("/expiring-soon", auth, roleGuard("Pharmacist", "Admin"), getExpiringMedicines);

module.exports = router;
