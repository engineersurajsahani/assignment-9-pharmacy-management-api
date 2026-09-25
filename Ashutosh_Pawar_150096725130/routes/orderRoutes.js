const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { isStaff, isCustomer } = require("../middleware/roleGuard");
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelMyOrder,
} = require("../controllers/orderController");

router.use(verifyToken);

router.post("/", isCustomer, placeOrder);
router.get("/my-orders", isCustomer, getMyOrders);
router.get("/", isStaff, getAllOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", isStaff, updateOrderStatus);
router.patch("/:id/cancel", isCustomer, cancelMyOrder);

module.exports = router;
