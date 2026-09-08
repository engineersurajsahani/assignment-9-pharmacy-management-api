const Medicine = require('../models/Medicine');

/**
 * @desc    Get all medicines with search & category filters
 * @route   GET /api/medicines
 * @access  Public (Customer, Pharmacist, Admin)
 */
const getAllMedicines = async (req, res, next) => {
  try {
    const { search, category, dosageForm, requiresPrescription, minPrice, maxPrice, page = 1, limit = 20, sortBy = 'name', order = 'asc' } = req.query;

    const query = {};

    // Keyword search over name, brand, or category
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { category: searchRegex }
      ];
    }

    // Exact or regex category filter
    if (category) {
      query.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    // Dosage form filter
    if (dosageForm) {
      query.dosageForm = dosageForm;
    }

    // Prescription required filter
    if (requiresPrescription !== undefined) {
      query.requiresPrescription = requiresPrescription === 'true' || requiresPrescription === true;
    }

    // Price range filters
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Pagination setup
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOrder = order.toLowerCase() === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortOrder };

    const [medicines, totalCount] = await Promise.all([
      Medicine.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      Medicine.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: medicines.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      data: medicines
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get medicine by ID
 * @route   GET /api/medicines/:id
 * @access  Public (Customer, Pharmacist, Admin)
 */
const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID: ${req.params.id}`
      });
    }

    return res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Query drugs expiring in the next 30 days (or specified days parameter)
 * @route   GET /api/medicines/expiring
 * @access  Pharmacist / Admin
 */
const getExpiringMedicines = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;

    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + days);

    // Query for medicines with expiryDate between now and thresholdDate (next 30 days)
    const expiringMedicines = await Medicine.find({
      expiryDate: {
        $gte: now,
        $lte: thresholdDate
      }
    }).sort({ expiryDate: 1 });

    return res.status(200).json({
      success: true,
      queryWindowDays: days,
      count: expiringMedicines.length,
      data: expiringMedicines
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a new medicine to inventory
 * @route   POST /api/medicines
 * @access  Pharmacist / Admin
 */
const createMedicine = async (req, res, next) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    // Validate essential fields
    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, brand, category, dosageForm, price, stockQuantity, and expiryDate.'
      });
    }

    const parsedExpiry = new Date(expiryDate);
    if (isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiryDate format. Please use ISO 8601 date string (e.g. YYYY-MM-DD).'
      });
    }

    const medicine = await Medicine.create({
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      dosageForm,
      price: Number(price),
      stockQuantity: Number(stockQuantity),
      requiresPrescription: Boolean(requiresPrescription),
      expiryDate: parsedExpiry
    });

    return res.status(201).json({
      success: true,
      message: 'Medicine added successfully.',
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update medicine stock, pricing, or metadata
 * @route   PUT /api/medicines/:id
 * @access  Pharmacist / Admin
 */
const updateMedicine = async (req, res, next) => {
  try {
    const medicineId = req.params.id;

    // Check if medicine exists
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID: ${medicineId}`
      });
    }

    // If expiryDate is provided, validate format
    if (req.body.expiryDate) {
      const parsedExpiry = new Date(req.body.expiryDate);
      if (isNaN(parsedExpiry.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expiryDate format. Please use ISO 8601 date string (e.g. YYYY-MM-DD).'
        });
      }
      req.body.expiryDate = parsedExpiry;
    }

    const updatedMedicine = await Medicine.findByIdAndUpdate(
      medicineId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Medicine updated successfully.',
      data: updatedMedicine
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete medicine from database
 * @route   DELETE /api/medicines/:id
 * @access  Admin Only
 */
const deleteMedicine = async (req, res, next) => {
  try {
    const medicineId = req.params.id;

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found with ID: ${medicineId}`
      });
    }

    await Medicine.findByIdAndDelete(medicineId);

    return res.status(200).json({
      success: true,
      message: `Medicine '${medicine.name}' (${medicineId}) deleted successfully from database.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMedicines,
  getMedicineById,
  getExpiringMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
};
