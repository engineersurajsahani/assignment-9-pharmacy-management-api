const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const controller = require("../controllers/authController");

router.post("/register", controller.register);
router.post("/register-staff", controller.registerStaff);
router.post("/login", controller.login);
router.get("/profile", auth, controller.profile);

module.exports = router;