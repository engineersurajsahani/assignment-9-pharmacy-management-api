const express = require("express");
const router = express.Router();
const {
  registerCustomer,
  registerStaff,
  login,
  getProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Public routes
router.post("/register", registerCustomer);
router.post("/register-staff", registerStaff);
router.post("/login", login);

// Protected route
router.get("/profile", protect, getProfile);

module.exports = router;