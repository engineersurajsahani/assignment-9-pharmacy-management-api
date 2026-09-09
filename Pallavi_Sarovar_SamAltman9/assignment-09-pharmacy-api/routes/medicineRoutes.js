const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleGuard");
const controller = require("../controllers/medicineController");

router.get("/", controller.getMedicines);
router.get("/expiring", auth, authorizeRoles("pharmacist", "admin"), controller.getExpiring);
router.post("/", auth, authorizeRoles("pharmacist", "admin"), controller.addMedicine);
router.put("/:id", auth, authorizeRoles("pharmacist", "admin"), controller.updateMedicine);
router.delete("/:id", auth, authorizeRoles("admin"), controller.deleteMedicine);

module.exports = router;