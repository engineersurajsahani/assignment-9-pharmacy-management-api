const Medicine = require('../models/Medicine');

const getMedicines = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const filter = {};

    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    const list = await Medicine.find(filter).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (err) {
    next(err);
  }
};

const getExpiringMedicines = async (req, res, next) => {
  try {
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const list = await Medicine.find({
      expiryDate: { $lte: thirtyDaysAhead }
    }).sort({ expiryDate: 1 });

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (err) {
    next(err);
  }
};

const getMedicineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const med = await Medicine.findById(id);

    if (!med) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    return res.status(200).json({ success: true, data: med });
  } catch (err) {
    next(err);
  }
};

const createMedicine = async (req, res, next) => {
  try {
    const {
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription = false,
      expiryDate
    } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({ success: false, message: 'All required medicine fields must be provided' });
    }

    const med = new Medicine({
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      dosageForm,
      price: Number(price),
      stockQuantity: Number(stockQuantity),
      requiresPrescription: Boolean(requiresPrescription),
      expiryDate: new Date(expiryDate)
    });

    await med.save();

    return res.status(201).json({
      success: true,
      message: 'Medicine added successfully',
      data: med
    });
  } catch (err) {
    next(err);
  }
};

const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const med = await Medicine.findByIdAndUpdate(id, req.body, { new: true });

    if (!med) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: med
    });
  } catch (err) {
    next(err);
  }
};

const deleteMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const med = await Medicine.findByIdAndDelete(id);

    if (!med) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMedicines,
  getExpiringMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine
};
