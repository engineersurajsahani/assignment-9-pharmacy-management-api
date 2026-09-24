const Medicine = require('../models/Medicine');

/**
 * @desc    Get all medicines with search & filter
 * @route   GET /api/medicines
 * @access  Public
 */
const getMedicines = async (req, res, next) => {
  try {
    const { search, category, dosageForm, prescription, minPrice, maxPrice } = req.query;

    const query = {};

    // Keyword search in name or brand
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by Category
    if (category) {
      query.category = { $regex: `^${category}$`, $options: 'i' };
    }

    // Filter by Dosage Form
    if (dosageForm) {
      query.dosageForm = dosageForm;
    }

    // Filter by prescription requirement
    if (prescription !== undefined) {
      query.requiresPrescription = prescription === 'true';
    }

    // Price range filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
    }

    const medicines = await Medicine.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single medicine by ID
 * @route   GET /api/medicines/:id
 * @access  Public
 */
const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with id ${req.params.id}`
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

/**
 * @desc    Add new medicine
 * @route   POST /api/medicines
 * @access  Private (Pharmacist / Admin)
 */
const createMedicine = async (req, res, next) => {
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
      message: 'Medicine added to inventory successfully',
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update medicine stock or pricing
 * @route   PUT /api/medicines/:id
 * @access  Private (Pharmacist / Admin)
 */
const updateMedicine = async (req, res, next) => {
  try {
    let medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with id ${req.params.id}`
      });
    }

    medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
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

/**
 * @desc    Delete medicine from catalog
 * @route   DELETE /api/medicines/:id
 * @access  Private (Admin Only)
 */
const deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with id ${req.params.id}`
      });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Medicine '${medicine.name}' deleted successfully by Admin`,
      deletedId: req.params.id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Query drugs expiring in the next 30 days & low-stock alerts using aggregation
 * @route   GET /api/medicines/expiring OR GET /api/reports/expiring-soon
 * @access  Private (Pharmacist / Admin)
 */
const getExpiringMedicines = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + days);

    // Expiring medicines query
    const expiringMedicines = await Medicine.aggregate([
      {
        $match: {
          expiryDate: { $lte: thresholdDate }
        }
      },
      {
        $addFields: {
          daysUntilExpiry: {
            $round: [
              {
                $divide: [
                  { $subtract: ['$expiryDate', now] },
                  1000 * 60 * 60 * 24
                ]
              },
              1
            ]
          },
          isExpired: {
            $cond: { if: { $lt: ['$expiryDate', now] }, then: true, else: false }
          }
        }
      },
      { $sort: { expiryDate: 1 } }
    ]);

    // Low stock aggregation (stock <= 15 items)
    const lowStockAlerts = await Medicine.aggregate([
      {
        $match: {
          stockQuantity: { $lte: 15 }
        }
      },
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          stockQuantity: 1,
          price: 1
        }
      },
      { $sort: { stockQuantity: 1 } }
    ]);

    res.status(200).json({
      success: true,
      filterDays: days,
      summary: {
        totalExpiringSoon: expiringMedicines.length,
        totalLowStock: lowStockAlerts.length
      },
      expiringMedicines,
      lowStockAlerts
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getExpiringMedicines
};
