const Medicine = require('../models/Medicine');

// @desc    Get all medicines with search & category filter
// @route   GET /api/medicines
// @access  Public / Authenticated
const getAllMedicines = async (req, res) => {
  try {
    const { search, category, requiresPrescription } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = { $regex: `^${category}$`, $options: 'i' };
    }

    if (requiresPrescription !== undefined) {
      query.requiresPrescription = requiresPrescription === 'true';
    }

    const medicines = await Medicine.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get single medicine details by ID
// @route   GET /api/medicines/:id
// @access  Public / Authenticated
const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    return res.status(200).json({
      success: true,
      medicine
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get drugs expiring in the next 30 days
// @route   GET /api/medicines/expiring OR /api/reports/expiring-soon
// @access  Private (Pharmacist / Admin)
const getExpiringMedicines = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // MongoDB aggregation pipeline to query drugs expiring within next 30 days
    const expiringMedicines = await Medicine.aggregate([
      {
        $match: {
          expiryDate: { $lte: thirtyDaysFromNow }
        }
      },
      {
        $addFields: {
          daysUntilExpiry: {
            $ceil: {
              $divide: [
                { $subtract: ['$expiryDate', now] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          isExpired: { $lt: ['$expiryDate', now] }
        }
      },
      {
        $sort: { expiryDate: 1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      count: expiringMedicines.length,
      expiringMedicines
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Add a new medicine
// @route   POST /api/medicines
// @access  Private (Pharmacist / Admin)
const addMedicine = async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, brand, category, dosageForm, price, stockQuantity, expiryDate'
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

    return res.status(201).json({
      success: true,
      message: 'Medicine added successfully',
      medicine
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update stock or price of a medicine
// @route   PUT /api/medicines/:id
// @access  Private (Pharmacist / Admin)
const updateMedicine = async (req, res) => {
  try {
    let medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      medicine
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete a drug from database
// @route   DELETE /api/medicines/:id
// @access  Private (Admin Only)
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

module.exports = {
  getAllMedicines,
  getMedicineById,
  getExpiringMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine
};
