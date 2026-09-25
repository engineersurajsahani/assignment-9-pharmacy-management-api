const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { isStaff, isAdmin } = require("../middleware/roleGuard");
const {
  getMedicines,
  getCategories,
  getMedicineById,
  getExpiringMedicines,
  getLowStockMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} = require("../controllers/medicineController");

router.get("/", getMedicines);
router.get("/categories", getCategories);
router.get("/expiring", verifyToken, isStaff, getExpiringMedicines);
router.get("/low-stock", verifyToken, isStaff, getLowStockMedicines);
router.get("/:id", getMedicineById);
router.post("/", verifyToken, isStaff, createMedicine);
router.put("/:id", verifyToken, isStaff, updateMedicine);
router.delete("/:id", verifyToken, isAdmin, deleteMedicine);

module.exports = router;
