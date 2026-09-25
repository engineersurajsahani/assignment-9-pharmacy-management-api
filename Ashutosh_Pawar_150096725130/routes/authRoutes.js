const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  registerCustomer,
  registerStaff,
  loginUser,
  getProfile,
} = require("../controllers/authController");

router.post("/register", registerCustomer);
router.post("/register-staff", registerStaff);
router.post("/login", loginUser);
router.get("/profile", verifyToken, getProfile);

module.exports = router;
