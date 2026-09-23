const express = require("express");
const router = express.Router();
const {
  getMedicines,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
} = require("../controllers/medicineController");
const { protect } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/roleGuard");

// PUBLIC - anyone can browse medicines
router.get("/", getMedicines);

// IMPORTANT: /expiring must be registered BEFORE any /:id route
// otherwise "expiring" would be treated as an id.
router.get(
  "/expiring",
  protect,
  authorizeRoles("pharmacist", "admin"),
  getExpiringMedicines
);

// pharmacist + admin can add/update; admin only can delete
router.post(
  "/",
  protect,
  authorizeRoles("pharmacist", "admin"),
  addMedicine
);

router.put(
  "/:id",
  protect,
  authorizeRoles("pharmacist", "admin"),
  updateMedicine
);

router.delete("/:id", protect, authorizeRoles("admin"), deleteMedicine);

module.exports = router;