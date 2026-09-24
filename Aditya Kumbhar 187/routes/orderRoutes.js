const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

// Customer routes
router.post("/", auth, roleGuard("Customer"), createOrder);
router.get("/my-orders", auth, roleGuard("Customer"), getMyOrders);

// Staff routes (Pharmacist / Admin)
router.get("/", auth, roleGuard("Pharmacist", "Admin"), getAllOrders);
router.patch("/:id/status", auth, roleGuard("Pharmacist", "Admin"), updateOrderStatus);

// Order by ID (Accessible by owner customer or staff)
router.get("/:id", auth, getOrderById);

module.exports = router;
