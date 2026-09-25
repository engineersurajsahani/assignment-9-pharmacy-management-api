const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { isStaff } = require("../middleware/roleGuard");
const { getExpiringMedicines, getLowStockMedicines } = require("../controllers/medicineController");
const { getOrderSummary } = require("../controllers/orderController");

router.use(verifyToken, isStaff);

router.get("/expiring-soon", getExpiringMedicines);
router.get("/low-stock", getLowStockMedicines);
router.get("/orders-summary", getOrderSummary);

module.exports = router;
