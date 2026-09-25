const Medicine = require('../models/Medicine');

const getMedicines = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category) {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);

    const [medicines, total] = await Promise.all([
      Medicine.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Medicine.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: medicines.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: medicines,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getExpiringSoon = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const medicines = await Medicine.find({
      expiryDate: { $gte: now, $lte: future },
    }).sort({ expiryDate: 1 });

    res.status(200).json({ success: true, count: medicines.length, windowDays: days, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json({ success: true, data: medicine });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    res.status(200).json({ success: true, data: medicine });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    res.status(200).json({ success: true, message: 'Medicine deleted', data: medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMedicines,
  getExpiringSoon,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
