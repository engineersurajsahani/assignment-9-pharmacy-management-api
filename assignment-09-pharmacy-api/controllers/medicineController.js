const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/medicines
// @desc    Get all medicines with optional search & category filter
// @access  Private (customer, pharmacist, admin)
// ─────────────────────────────────────────────────────────────────────────────
const getMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      // Search across name, brand, and category fields (case-insensitive)
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const medicines = await Medicine.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Medicines retrieved successfully.',
      count: medicines.length,
      data: { medicines },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching medicines.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/medicines/:id
// @desc    Get a single medicine by ID
// @access  Private (customer, pharmacist, admin)
// ─────────────────────────────────────────────────────────────────────────────
const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine retrieved successfully.',
      data: { medicine },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error fetching medicine.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/medicines/expiring
// @desc    Get medicines expiring within the next 30 days
// @access  Private (pharmacist, admin)
// ─────────────────────────────────────────────────────────────────────────────
const getExpiringMedicines = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    const medicines = await Medicine.find({
      expiryDate: { $gte: now, $lte: thirtyDaysLater },
    }).sort({ expiryDate: 1 });

    return res.status(200).json({
      success: true,
      message: 'Medicines expiring within 30 days retrieved successfully.',
      count: medicines.length,
      data: { medicines },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching expiring medicines.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/medicines
// @desc    Add a new medicine
// @access  Private (pharmacist, admin)
// ─────────────────────────────────────────────────────────────────────────────
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

    // Required field validation
    if (!name || !brand || !category || !dosageForm || price === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'name, brand, category, dosageForm, price, and expiryDate are required.',
      });
    }

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity: stockQuantity !== undefined ? stockQuantity : 0,
      requiresPrescription: requiresPrescription !== undefined ? requiresPrescription : false,
      expiryDate,
    });

    return res.status(201).json({
      success: true,
      message: 'Medicine added successfully.',
      data: { medicine },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error adding medicine.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/medicines/:id
// @desc    Update a medicine (stock, pricing, etc.)
// @access  Private (pharmacist, admin)
// ─────────────────────────────────────────────────────────────────────────────
const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    const medicine = await Medicine.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine updated successfully.',
      data: { medicine },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error updating medicine.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/medicines/:id
// @desc    Delete a medicine
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    const medicine = await Medicine.findByIdAndDelete(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully.',
      data: { medicine },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error deleting medicine.',
      error: error.message,
    });
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
};
