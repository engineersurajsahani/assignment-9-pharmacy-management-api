const Medicine = require('../models/Medicine');

// @desc    Get all medicines with search, category filter, and pagination
// @route   GET /api/medicines
// @access  Public
exports.getMedicines = async (req, res, next) => {
  try {
    const { search, category, dosageForm, page = 1, limit = 10 } = req.query;

    const query = {};

    // Search by name (case-insensitive regex)
    if (search) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    // Filter by category
    if (category) {
      query.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    // Optional filter by dosage form
    if (dosageForm) {
      query.dosageForm = dosageForm;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const totalMedicines = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: medicines.length,
      pagination: {
        totalItems: totalMedicines,
        totalPages: Math.ceil(totalMedicines / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
      data: medicines,
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

    // Aggregation pipeline to find medicines expiring within 30 days
    const expiringMedicines = await Medicine.aggregate([
      {
        $match: {
          expiryDate: {
            $gte: now,
            $lte: thirtyDaysFromNow,
          },
        },
      },
      {
        $addFields: {
          daysUntilExpiry: {
            $ceil: {
              $divide: [
                { $subtract: ['$expiryDate', now] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
      {
        $sort: { expiryDate: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: expiringMedicines.length,
      message: 'Medicines expiring in the next 30 days',
      data: expiringMedicines,
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
        message: `Medicine not found with id ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new medicine
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
      expiryDate,
    } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required medicine fields (name, brand, category, dosageForm, price, stockQuantity, expiryDate)',
      });
    }

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription: Boolean(requiresPrescription),
      expiryDate,
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added successfully to inventory',
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update medicine details / stock / price
// @route   PUT /api/medicines/:id
// @access  Private (Pharmacist, Admin)
exports.updateMedicine = async (req, res, next) => {
  try {
    let medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with id ${req.params.id}`,
      });
    }

    medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete medicine
// @route   DELETE /api/medicines/:id
// @access  Private (Admin Only)
exports.deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with id ${req.params.id}`,
      });
    }

    await medicine.deleteOne();

    res.status(200).json({
      success: true,
      message: `Medicine '${medicine.name}' deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};
