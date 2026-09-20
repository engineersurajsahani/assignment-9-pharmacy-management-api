const Medicine = require('../models/Medicine');

// @desc    Get all medicines with search, category filtering & pagination
// @route   GET /api/medicines
// @access  Public
const getMedicines = async (req, res, next) => {
  try {
    const { search, category, dosageForm, requiresPrescription, page = 1, limit = 20, sort = 'name' } = req.query;

    const query = {};

    // Keyword search on name and brand
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = { $regex: `^${category}$`, $options: 'i' };
    }

    // Dosage form filter
    if (dosageForm) {
      query.dosageForm = dosageForm;
    }

    // Prescription filter
    if (requiresPrescription !== undefined) {
      query.requiresPrescription = requiresPrescription === 'true' || requiresPrescription === true;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: medicines.length,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: medicines
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single medicine by ID
// @route   GET /api/medicines/:id
// @access  Public
const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`
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

// @desc    Query drugs expiring in the next 30 days (Aggregation)
// @route   GET /api/medicines/expiring OR /api/reports/expiring-soon
// @access  Pharmacist / Admin
const getExpiringMedicines = async (req, res, next) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiringMedicines = await Medicine.aggregate([
      {
        $match: {
          expiryDate: {
            $lte: thirtyDaysFromNow
          }
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
          expiryDate: 1,
          requiresPrescription: 1,
          daysUntilExpiry: {
            $round: [
              {
                $divide: [
                  { $subtract: ['$expiryDate', today] },
                  1000 * 60 * 60 * 24
                ]
              },
              1
            ]
          },
          isExpired: {
            $cond: [{ $lt: ['$expiryDate', today] }, true, false]
          }
        }
      },
      {
        $sort: { expiryDate: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: expiringMedicines.length,
      data: expiringMedicines
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new medicine
// @route   POST /api/medicines
// @access  Pharmacist / Admin
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
      price: Number(price),
      stockQuantity: Number(stockQuantity),
      requiresPrescription: Boolean(requiresPrescription),
      expiryDate: new Date(expiryDate)
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added successfully.',
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update medicine stock, price, or details
// @route   PUT /api/medicines/:id
// @access  Pharmacist / Admin
const updateMedicine = async (req, res, next) => {
  try {
    let medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`
      });
    }

    medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully.',
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete medicine from database
// @route   DELETE /api/medicines/:id
// @access  Admin Only
const deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID ${req.params.id}`
      });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Medicine '${medicine.name}' deleted successfully.`,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  getExpiringMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
};
