const Medicine = require('../models/Medicine');

// GET /api/medicines (Public — search & category filter)
const getMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (category) {
      filter.category = category;
    }

    const medicines = await Medicine.find(filter);
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/medicines/expiring (Pharmacist/Admin — expiring in next 30 days)
const getExpiringSoon = async (req, res) => {
  try {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    const medicines = await Medicine.find({
      expiryDate: { $gte: today, $lte: in30Days }
    }).sort({ expiryDate: 1 });

    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/medicines (Pharmacist/Admin)
const addMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json(medicine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/medicines/:id (Pharmacist/Admin)
const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    res.json(medicine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/medicines/:id (Admin only)
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMedicines, getExpiringSoon, addMedicine, updateMedicine, deleteMedicine };