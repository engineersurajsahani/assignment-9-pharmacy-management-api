const express = require("express");
const router = express.Router();
const {
  getMedicines,
  getExpiringMedicines,
  getMedicineById,
  addMedicine,
  updateMedicine,
  deleteMedicine,
} = require("../controllers/medicineController");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

// Public routes
router.get("/", getMedicines);

// Expiring medicines (Pharmacist / Admin)
router.get("/expiring", auth, roleGuard("Pharmacist", "Admin"), getExpiringMedicines);

// Single medicine details
router.get("/:id", getMedicineById);

// Add medicine (Pharmacist / Admin)
router.post("/", auth, roleGuard("Pharmacist", "Admin"), addMedicine);

// Update medicine stock/price (Pharmacist / Admin)
router.put("/:id", auth, roleGuard("Pharmacist", "Admin"), updateMedicine);

// Delete medicine (Admin Only)
router.delete("/:id", auth, roleGuard("Admin"), deleteMedicine);

module.exports = router;
