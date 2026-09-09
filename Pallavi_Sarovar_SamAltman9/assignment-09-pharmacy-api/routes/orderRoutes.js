const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleGuard");
const controller = require("../controllers/orderController");

router.post("/", auth, authorizeRoles("customer"), controller.createOrder);
router.get("/my-orders", auth, authorizeRoles("customer"), controller.getMyOrders);
router.get("/", auth, authorizeRoles("pharmacist", "admin"), controller.getAllOrders);
router.patch("/:id/status", auth, authorizeRoles("pharmacist", "admin"), controller.updateOrderStatus);

module.exports = router;