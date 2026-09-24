const Medicine = require('../models/Medicine');

// @desc    Get all medicines with search & category filter
// @route   GET /api/medicines
// @access  Public
const getMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    const medicines = await Medicine.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get drugs expiring in the next 30 days
// @route   GET /api/medicines/expiring OR GET /api/reports/expiring-soon
// @access  Private (Pharmacist / Admin)
const getExpiringMedicines = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Find medicines where expiryDate is between now and 30 days from now
    const expiringMedicines = await Medicine.find({
      expiryDate: {
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    }).sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: expiringMedicines.length,
      data: expiringMedicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add new medicine
// @route   POST /api/medicines
// @access  Private (Pharmacist / Admin)
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
      expiryDate
    } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, brand, category, dosageForm, price, stockQuantity, expiryDate.'
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
      expiryDate
    });

    res.status(201).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update medicine stock or price
// @route   PUT /api/medicines/:id
// @access  Private (Pharmacist / Admin)
const updateMedicine = async (req, res) => {
  try {
    let medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with id of ${req.params.id}`
      });
    }

    medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete medicine from database
// @route   DELETE /api/medicines/:id
// @access  Private (Admin Only)
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with id of ${req.params.id}`
      });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getMedicines,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine
};
