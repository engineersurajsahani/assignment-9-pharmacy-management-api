const express = require("express");
const router = express.Router();
const {
  register,
  registerStaff,
  login,
  getProfile,
} = require("../controllers/authController");
const auth = require("../middleware/auth");

router.post("/register", register);
router.post("/register-staff", registerStaff);
router.post("/login", login);
router.get("/profile", auth, getProfile);

module.exports = router;
