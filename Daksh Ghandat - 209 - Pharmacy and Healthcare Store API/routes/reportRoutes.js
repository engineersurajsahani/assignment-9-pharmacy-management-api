const express = require("express");
const router = express.Router();
const {
  getLowStockMedicines,
  getExpiringSoon,
} = require("../controllers/reportController");
const { protect } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/roleGuard");

router.get(
  "/low-stock",
  protect,
  authorizeRoles("pharmacist", "admin"),
  getLowStockMedicines
);

router.get(
  "/expiring-soon",
  protect,
  authorizeRoles("pharmacist", "admin"),
  getExpiringSoon
);

module.exports = router;