const Medicine = require('../models/Medicine');

/**
 * @desc    Get all medicines with search, category filtering & pagination
 * @route   GET /api/medicines
 * @access  Public
 */
const getMedicines = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10, sort } = req.query;

    const query = {};

    // Filter by category if specified
    if (category) {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // Filter by search keyword matching name, brand, or category
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Determine sort
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'expiry') sortOption = { expiryDate: 1 };
    else if (sort === 'name') sortOption = { name: 1 };

    const [medicines, total] = await Promise.all([
      Medicine.find(query).sort(sortOption).skip(skip).limit(limitNum),
      Medicine.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        count: medicines.length,
        medicines,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error retrieving medicines: ${error.message}`,
    });
  }
};

/**
 * @desc    Get single medicine by ID
 * @route   GET /api/medicines/:id
 * @access  Public
 */
const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`,
      });
    }
    return res.status(500).json({
      success: false,
      message: `Server error retrieving medicine: ${error.message}`,
    });
  }
};

/**
 * @desc    Get medicines expiring in the next 30 days
 * @route   GET /api/medicines/expiring OR GET /api/reports/expiring-soon
 * @access  Private (Pharmacist, Admin)
 */
const getExpiringMedicines = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringMedicines = await Medicine.find({
      expiryDate: {
        $gte: now,
        $lte: thirtyDaysFromNow,
      },
    }).sort({ expiryDate: 1 });

    return res.status(200).json({
      success: true,
      message: `Found ${expiringMedicines.length} medicine(s) expiring within the next 30 days`,
      data: {
        count: expiringMedicines.length,
        medicines: expiringMedicines,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error retrieving expiring medicines: ${error.message}`,
    });
  }
};

/**
 * @desc    Create a new medicine
 * @route   POST /api/medicines
 * @access  Private (Pharmacist, Admin)
 */
const createMedicine = async (req, res) => {
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

    if (!name || !brand || !category || !dosageForm || price === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, brand, category, dosageForm, price, expiryDate',
      });
    }

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity: stockQuantity !== undefined ? stockQuantity : 0,
      requiresPrescription: !!requiresPrescription,
      expiryDate,
    });

    return res.status(201).json({
      success: true,
      message: 'Medicine created successfully',
      data: medicine,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: `Server error creating medicine: ${error.message}`,
    });
  }
};

/**
 * @desc    Update an existing medicine
 * @route   PUT /api/medicines/:id
 * @access  Private (Pharmacist, Admin)
 */
const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`,
      });
    }

    const updatedMedicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: updatedMedicine,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`,
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: `Server error updating medicine: ${error.message}`,
    });
  }
};

/**
 * @desc    Delete a medicine
 * @route   DELETE /api/medicines/:id
 * @access  Private (Admin only)
 */
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`,
      });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: `Medicine '${medicine.name}' (ID: ${req.params.id}) was successfully deleted`,
      data: {
        id: req.params.id,
        name: medicine.name,
      },
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`,
      });
    }
    return res.status(500).json({
      success: false,
      message: `Server error deleting medicine: ${error.message}`,
    });
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
