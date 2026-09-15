const Medicine = require('../models/Medicine');

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection'];

/**
 * GET /api/medicines — public. Supports ?search= (name, case-insensitive)
 * and ?category= filter.
 */
async function listMedicines(req, res) {
  try {
    const { search, category } = req.query;
    const filter = {};

    if (category) {
      filter.category = { $regex: `^${category}$`, $options: 'i' };
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 });
    return res.status(200).json({ success: true, count: medicines.length, data: medicines });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/medicines/expiring — Pharmacist/Admin. Medicines expiring within 30 days.
 */
async function expiringSoon(req, res) {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const medicines = await Medicine.find({
      expiryDate: { $gte: now, $lte: in30Days }
    }).sort({ expiryDate: 1 });

    return res.status(200).json({ success: true, count: medicines.length, data: medicines });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/medicines/:id — public
 */
async function getMedicine(req, res) {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    return res.status(200).json({ success: true, data: medicine });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/medicines — Pharmacist/Admin
 */
async function createMedicine(req, res) {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'name, brand, category, dosageForm, price, stockQuantity and expiryDate are required'
      });
    }
    if (!DOSAGE_FORMS.includes(dosageForm)) {
      return res.status(400).json({
        success: false,
        message: `dosageForm must be one of: ${DOSAGE_FORMS.join(', ')}`
      });
    }
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ success: false, message: 'price must be a non-negative number' });
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({ success: false, message: 'stockQuantity must be a non-negative integer' });
    }
    const parsedExpiry = new Date(expiryDate);
    if (Number.isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({ success: false, message: 'expiryDate must be a valid date' });
    }

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription: !!requiresPrescription,
      expiryDate: parsedExpiry
    });

    return res.status(201).json({ success: true, message: 'Medicine added', data: medicine });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/medicines/:id — Pharmacist/Admin. Update stock/price or other fields.
 */
async function updateMedicine(req, res) {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    if (dosageForm !== undefined && !DOSAGE_FORMS.includes(dosageForm)) {
      return res.status(400).json({
        success: false,
        message: `dosageForm must be one of: ${DOSAGE_FORMS.join(', ')}`
      });
    }
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({ success: false, message: 'price must be a non-negative number' });
    }
    if (stockQuantity !== undefined && (!Number.isInteger(stockQuantity) || stockQuantity < 0)) {
      return res.status(400).json({ success: false, message: 'stockQuantity must be a non-negative integer' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (brand !== undefined) updates.brand = brand;
    if (category !== undefined) updates.category = category;
    if (dosageForm !== undefined) updates.dosageForm = dosageForm;
    if (price !== undefined) updates.price = price;
    if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
    if (requiresPrescription !== undefined) updates.requiresPrescription = !!requiresPrescription;
    if (expiryDate !== undefined) {
      const parsedExpiry = new Date(expiryDate);
      if (Number.isNaN(parsedExpiry.getTime())) {
        return res.status(400).json({ success: false, message: 'expiryDate must be a valid date' });
      }
      updates.expiryDate = parsedExpiry;
    }

    const medicine = await Medicine.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    return res.status(200).json({ success: true, message: 'Medicine updated', data: medicine });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/medicines/:id — Admin only
 */
async function deleteMedicine(req, res) {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    return res.status(200).json({ success: true, message: 'Medicine deleted' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  listMedicines,
  expiringSoon,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine
};
