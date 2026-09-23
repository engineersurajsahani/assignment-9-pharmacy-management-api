const Medicine = require("../models/Medicine");
const mongoose = require("mongoose");

// Helper: validate a MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc   Browse medicines (PUBLIC) with optional search + category filter
// @route  GET /api/medicines
const getMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = {};

    // Case-insensitive search on name, brand and category
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { brand: regex },
        { category: regex },
      ];
    }

    // Optional category filter
    if (category) {
      filter.category = new RegExp(`^${category}$`, "i");
    }

    const medicines = await Medicine.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Medicines fetched successfully.",
      data: medicines,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Get medicines expiring within the next 30 days
// @route  GET /api/medicines/expiring
const getExpiringMedicines = async (req, res) => {
  try {
    const today = new Date();
    // Reset time to midnight for consistent date math
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    // Expiring means: expiryDate is between today and the next 30 days.
    // Medicines already expired (expiryDate < today) are excluded.
    const expiring = await Medicine.find({
      expiryDate: { $gte: today, $lte: thirtyDaysLater },
    }).sort({ expiryDate: 1 });

    return res.status(200).json({
      success: true,
      message: "Medicines expiring within the next 30 days.",
      data: expiring,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Add a new medicine
// @route  POST /api/medicines
const addMedicine = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription,
      expiryDate,
    } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: name, brand, category, dosageForm, price, stockQuantity, expiryDate.",
      });
    }

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription: requiresPrescription || false,
      expiryDate,
    });

    return res.status(201).json({
      success: true,
      message: "Medicine added successfully.",
      data: medicine,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Update a medicine
// @route  PUT /api/medicines/:id
const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID.",
      });
    }

    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found.",
      });
    }

    // Only update the fields that were actually sent
    const allowedUpdates = [
      "name",
      "brand",
      "category",
      "dosageForm",
      "price",
      "stockQuantity",
      "requiresPrescription",
      "expiryDate",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        medicine[field] = req.body[field];
      }
    });

    // Validate before saving (mongoose runs validators on save)
    const updatedMedicine = await medicine.save();

    return res.status(200).json({
      success: true,
      message: "Medicine updated successfully.",
      data: updatedMedicine,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Delete a medicine (ADMIN only)
// @route  DELETE /api/medicines/:id
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID.",
      });
    }

    const medicine = await Medicine.findByIdAndDelete(id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Medicine deleted successfully.",
      data: { id: medicine._id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getMedicines,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
};