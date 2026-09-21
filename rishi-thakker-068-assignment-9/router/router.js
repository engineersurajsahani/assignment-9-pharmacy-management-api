const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");
const User = require("../models/User");
const Medicine = require("../models/Medicine");
const Order = require("../models/Order");

const STAFF_SECRET_KEY = "itm-staff-key";

router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "customer",
    });

    res.status(201).json({
      message: "Customer registered successfully",
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/auth/register-staff", async (req, res) => {
  try {
    const { username, email, password, role, adminKey } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "username, email, password and role are required" });
    }

    if (!["pharmacist", "admin"].includes(role)) {
      return res.status(400).json({ message: "role must be 'pharmacist' or 'admin'" });
    }

    if (adminKey !== STAFF_SECRET_KEY) {
      return res.status(403).json({ message: "Invalid admin key" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "Staff account registered successfully",
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      "itm",
      { expiresIn: "1d" }
    );

    res.status(200).json({ message: "Login successful", token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/auth/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ---------- MEDICINES ----------

router.get("/medicines", async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: "i" };
    }
    if (req.query.name) {
      filter.name = { $regex: req.query.name, $options: "i" };
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 });
    res.status(200).json(medicines);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/medicines/expiring", auth, roleGuard("pharmacist", "admin"), async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = await Medicine.find({
      expiryDate: { $lte: thirtyDaysFromNow },
    }).sort({ expiryDate: 1 });

    res.status(200).json(expiringSoon);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/medicines", auth, roleGuard("pharmacist", "admin"), async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription,
      expiryDate,
    });

    res.status(201).json(medicine);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/medicines/:id", auth, roleGuard("pharmacist", "admin"), async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.status(200).json(medicine);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/medicines/:id", auth, roleGuard("admin"), async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.status(200).json({ message: "Medicine deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.post("/orders", auth, roleGuard("customer"), async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items must be a non-empty array" });
    }

    let totalAmount = 0;
    let needsPrescription = false;
    const orderItems = [];

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicineId);
      if (!medicine) {
        return res.status(404).json({ message: `Medicine not found: ${item.medicineId}` });
      }

      const quantity = Number(item.quantity);
      if (!quantity || quantity < 1) {
        return res.status(400).json({ message: `Invalid quantity for ${medicine.name}` });
      }

      if (medicine.stockQuantity < quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${medicine.name}` });
      }

      if (medicine.requiresPrescription) {
        needsPrescription = true;
      }

      orderItems.push({
        medicine: medicine._id,
        quantity,
        unitPrice: medicine.price,
      });

      totalAmount += medicine.price * quantity;
    }

    if (needsPrescription && !prescriptionNotes) {
      return res.status(400).json({ message: "prescriptionNotes required for prescription medicines" });
    }

    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      prescriptionNotes,
      status: "pending",
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/orders/my-orders", auth, roleGuard("customer"), async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate("items.medicine", "name brand price")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/orders", auth, roleGuard("pharmacist", "admin"), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate("customer", "username email")
      .populate("items.medicine", "name brand price")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/orders/:id/status", auth, roleGuard("pharmacist", "admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "approved", "dispensed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "approved" && order.status !== "approved") {
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine);
        if (!medicine || medicine.stockQuantity < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock to approve order (medicine: ${item.medicine})`,
          });
        }
      }

      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: -item.quantity },
        });
      }
    }

    order.status = status;
    await order.save();

    res.status(200).json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
