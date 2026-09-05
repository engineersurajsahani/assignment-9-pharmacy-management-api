const Medicine = require('../models/Medicine');

// @desc    Get all medicines with search & filter
// @route   GET /api/medicines
// @access  Public
exports.getMedicines = async (req, res, next) => {
  try {
    const { search, category, dosageForm, requiresPrescription, inStock } = req.query;
    const query = {};

    // Keyword search over name, brand, or category
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Dosage form filter
    if (dosageForm) {
      query.dosageForm = { $regex: new RegExp(`^${dosageForm}$`, 'i') };
    }

    // Prescription required filter
    if (requiresPrescription !== undefined) {
      query.requiresPrescription = requiresPrescription === 'true' || requiresPrescription === true;
    }

    // Stock availability filter
    if (inStock === 'true') {
      query.stockQuantity = { $gt: 0 };
    }

    const medicines = await Medicine.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single medicine by ID
// @route   GET /api/medicines/:id
// @access  Public
exports.getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get medicines expiring within the next 30 days
// @route   GET /api/medicines/expiring (and GET /api/reports/expiring-soon)
// @access  Private (Pharmacist, Admin)
exports.getExpiringMedicines = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // MongoDB query for medicines expiring between now and 30 days
    const expiringMedicines = await Medicine.find({
      expiryDate: {
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    }).sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      message: 'Expiring medicines retrieved successfully (next 30 days)',
      count: expiringMedicines.length,
      data: expiringMedicines
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock medicines (stock <= threshold, default 10)
// @route   GET /api/medicines/low-stock (and GET /api/reports/low-stock)
// @access  Private (Pharmacist, Admin)
exports.getLowStockMedicines = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 10;

    const lowStockMedicines = await Medicine.aggregate([
      {
        $match: {
          stockQuantity: { $lte: threshold }
        }
      },
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          dosageForm: 1,
          price: 1,
          stockQuantity: 1,
          requiresPrescription: 1,
          expiryDate: 1,
          isOutOfStock: { $eq: ['$stockQuantity', 0] }
        }
      },
      {
        $sort: { stockQuantity: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: lowStockMedicines.length,
      threshold,
      data: lowStockMedicines
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new medicine
// @route   POST /api/medicines
// @access  Private (Pharmacist, Admin)
exports.createMedicine = async (req, res, next) => {
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

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription,
      expiryDate
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added successfully',
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update medicine stock or price or details
// @route   PUT /api/medicines/:id
// @access  Private (Pharmacist, Admin)
exports.updateMedicine = async (req, res, next) => {
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
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a medicine
// @route   DELETE /api/medicines/:id
// @access  Private (Admin Only)
exports.deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    next(error);
  }
};
