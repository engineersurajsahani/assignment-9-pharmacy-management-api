const Medicine = require('../models/Medicine');

/**
 * GET /api/medicines
 * List medicines with search & category filter (public)
 */
exports.getAllMedicines = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;

    let query = {};

    // Text search on name and brand
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const medicines = await Medicine.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Medicine.countDocuments(query);

    res.json({
      success: true,
      count: medicines.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      medicines
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /api/medicines/expiring
 * Get medicines expiring in the next 30 days (Pharmacist / Admin)
 */
exports.getExpiringMedicines = async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const medicines = await Medicine.find({
      expiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
    }).sort({ expiryDate: 1 });

    res.json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /api/medicines/:id
 * Get a single medicine by ID
 */
exports.getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/medicines
 * Add new medicine (Pharmacist / Admin)
 */
exports.createMedicine = async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    if (!name || !brand || !category || !dosageForm || price === undefined || stockQuantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'name, brand, category, dosageForm, price, stockQuantity, and expiryDate are required'
      });
    }

    const validDosageForms = ['Tablet', 'Capsule', 'Syrup', 'Injection'];
    if (!validDosageForms.includes(dosageForm)) {
      return res.status(400).json({
        success: false,
        message: `dosageForm must be one of: ${validDosageForms.join(', ')}`
      });
    }

    if (price < 0 || stockQuantity < 0) {
      return res.status(400).json({ success: false, message: 'price and stockQuantity must be non-negative' });
    }

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription: requiresPrescription || false,
      expiryDate: new Date(expiryDate)
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added successfully',
      medicine
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * PUT /api/medicines/:id
 * Update medicine stock or pricing (Pharmacist / Admin)
 */
exports.updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow updating certain fields
    const allowedUpdates = ['name', 'brand', 'category', 'dosageForm', 'price', 'stockQuantity', 'requiresPrescription', 'expiryDate'];
    const updateData = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const medicine = await Medicine.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    res.json({
      success: true,
      message: 'Medicine updated successfully',
      medicine
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * DELETE /api/medicines/:id
 * Delete medicine (Admin only)
 */
exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    res.json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
