const Medicine = require("../models/Medicine");

exports.getMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } }
      ];
    }

    if (category) filter.category = { $regex: category, $options: "i" };

    const medicines = await Medicine.find(filter).sort({ createdAt: -1 });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExpiring = async (req, res) => {
  try {
    const now = new Date();
    const next30 = new Date();
    next30.setDate(now.getDate() + 30);

    const medicines = await Medicine.find({
      expiryDate: { $gte: now, $lte: next30 }
    }).sort({ expiryDate: 1 });

    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json({
      message: "Medicine added successfully",
      medicine
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!medicine) return res.status(404).json({ message: "Medicine not found" });

    res.json({
      message: "Medicine updated successfully",
      medicine
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) return res.status(404).json({ message: "Medicine not found" });

    res.json({ message: "Medicine deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};