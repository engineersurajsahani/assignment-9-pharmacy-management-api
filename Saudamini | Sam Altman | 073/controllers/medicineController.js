const Medicine = require('../models/Medicine');

// List medicines with search & category filter (Public)
exports.getAllMedicines = async (req, res) => {
  try {
    const { search, category, brand, requiresPrescription, inStock } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') }
      ];
    }

    if (category) {
      filter.category = new RegExp(category, 'i');
    }

    if (brand) {
      filter.brand = new RegExp(brand, 'i');
    }

    if (requiresPrescription !== undefined) {
      filter.requiresPrescription = requiresPrescription === 'true';
    }

    if (inStock === 'true') {
      filter.stockQuantity = { $gt: 0 };
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Query medicines expiring in the next 30 days (Pharmacist / Admin)
exports.getExpiringMedicines = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    const expiringMedicines = await Medicine.find({
      expiryDate: {
        $gte: now,
        $lte: thirtyDaysAhead
      }
    }).sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: expiringMedicines.length,
      data: expiringMedicines
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Fetch single medicine by ID
exports.getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Add new medicine (Pharmacist / Admin)
exports.createMedicine = async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, brand, category, dosageForm, price, stockQuantity, expiryDate) are required'
      });
    }

    const newMedicine = new Medicine({
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      dosageForm,
      price: Number(price),
      stockQuantity: Number(stockQuantity),
      requiresPrescription: requiresPrescription === true || requiresPrescription === 'true',
      expiryDate: new Date(expiryDate)
    });

    await newMedicine.save();

    res.status(201).json({
      success: true,
      message: 'Medicine added to inventory successfully',
      data: newMedicine
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update stock or pricing (Pharmacist / Admin)
exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    const updates = req.body;
    if (updates.name !== undefined) medicine.name = updates.name.trim();
    if (updates.brand !== undefined) medicine.brand = updates.brand.trim();
    if (updates.category !== undefined) medicine.category = updates.category.trim();
    if (updates.dosageForm !== undefined) medicine.dosageForm = updates.dosageForm;
    if (updates.price !== undefined) medicine.price = Number(updates.price);
    if (updates.stockQuantity !== undefined) medicine.stockQuantity = Number(updates.stockQuantity);
    if (updates.requiresPrescription !== undefined) medicine.requiresPrescription = Boolean(updates.requiresPrescription);
    if (updates.expiryDate !== undefined) medicine.expiryDate = new Date(updates.expiryDate);

    await medicine.save();

    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: medicine
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete medicine (Admin Only)
exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
