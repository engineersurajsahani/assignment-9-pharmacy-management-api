const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/roleGuard");

// Customer only
router.post("/", protect, authorizeRoles("customer"), createOrder);

// Customer only - must be registered before /:id style routes
router.get(
  "/my-orders",
  protect,
  authorizeRoles("customer"),
  getMyOrders
);

// pharmacist + admin
router.get(
  "/",
  protect,
  authorizeRoles("pharmacist", "admin"),
  getAllOrders
);

// pharmacist + admin
router.patch(
  "/:id/status",
  protect,
  authorizeRoles("pharmacist", "admin"),
  updateOrderStatus
);

module.exports = router;