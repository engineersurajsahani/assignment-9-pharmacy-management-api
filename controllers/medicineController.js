const Medicine = require('../models/Medicine');

// Get all medicines with optional search and category filter
const getMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    const medicines = await Medicine.find(filter).sort({ createdAt: -1 });

    res.json({
      count: medicines.length,
      medicines
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch medicines.',
      error: error.message
    });
  }
};

// Get medicines expiring within the next 30 days
const getExpiringMedicines = async (req, res) => {
  try {
    const today = new Date();

    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    const medicines = await Medicine.find({
      expiryDate: {
        $gte: today,
        $lte: next30Days
      }
    }).sort({ expiryDate: 1 });

    res.json({
      count: medicines.length,
      medicines
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch expiring medicines.',
      error: error.message
    });
  }
};

// Add a medicine
const createMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);

    res.status(201).json({
      message: 'Medicine added successfully.',
      medicine
    });
  } catch (error) {
    res.status(400).json({
      message: 'Failed to add medicine.',
      error: error.message
    });
  }
};

// Update a medicine
const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!medicine) {
      return res.status(404).json({
        message: 'Medicine not found.'
      });
    }

    res.json({
      message: 'Medicine updated successfully.',
      medicine
    });
  } catch (error) {
    res.status(400).json({
      message: 'Failed to update medicine.',
      error: error.message
    });
  }
};

// Delete a medicine
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        message: 'Medicine not found.'
      });
    }

    res.json({
      message: 'Medicine deleted successfully.'
    });
  } catch (error) {
    res.status(400).json({
      message: 'Failed to delete medicine.',
      error: error.message
    });
  }
};

module.exports = {
  getMedicines,
  getExpiringMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
};