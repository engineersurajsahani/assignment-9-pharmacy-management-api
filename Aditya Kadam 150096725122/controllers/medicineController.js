const Medicine = require('../models/Medicine');

const getAllMedicines = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, inStock, requiresPrescription } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (requiresPrescription !== undefined) filter.requiresPrescription = requiresPrescription === 'true';
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (inStock === 'true') filter.stockQuantity = { $gt: 0 };

    const medicines = await Medicine.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medicines.',
      error: error.message
    });
  }
};

const getExpiringMedicines = async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringMedicines = await Medicine.find({
      expiryDate: { $lte: thirtyDaysFromNow }
    }).sort({ expiryDate: 1 });

    res.json({
      success: true,
      count: expiringMedicines.length,
      data: expiringMedicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring medicines.',
      error: error.message
    });
  }
};

const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.'
      });
    }

    res.json({
      success: true,
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medicine.',
      error: error.message
    });
  }
};

const createMedicine = async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided.'
      });
    }

    const medicine = new Medicine({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription: requiresPrescription || false,
      expiryDate
    });

    await medicine.save();

    res.status(201).json({
      success: true,
      message: 'Medicine created successfully.',
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create medicine.',
      error: error.message
    });
  }
};

const updateMedicine = async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.'
      });
    }

    if (name) medicine.name = name;
    if (brand) medicine.brand = brand;
    if (category) medicine.category = category;
    if (dosageForm) medicine.dosageForm = dosageForm;
    if (price !== undefined) medicine.price = price;
    if (stockQuantity !== undefined) medicine.stockQuantity = stockQuantity;
    if (requiresPrescription !== undefined) medicine.requiresPrescription = requiresPrescription;
    if (expiryDate) medicine.expiryDate = expiryDate;

    await medicine.save();

    res.json({
      success: true,
      message: 'Medicine updated successfully.',
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update medicine.',
      error: error.message
    });
  }
};

const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.'
      });
    }

    res.json({
      success: true,
      message: 'Medicine deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete medicine.',
      error: error.message
    });
  }
};

module.exports = {
  getAllMedicines,
  getExpiringMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine
};
