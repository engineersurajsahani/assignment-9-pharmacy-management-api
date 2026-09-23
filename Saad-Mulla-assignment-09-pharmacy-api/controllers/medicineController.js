const Medicine = require('../models/Medicine');

exports.getMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    if (search) {
      query.name = new RegExp(search, 'i');
    }
    if (category) {
      query.category = new RegExp(category, 'i');
    }

    const medicines = await Medicine.find(query).sort({ createdAt: -1 });
    res.status(200).json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getExpiringSoon = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringMedicines = await Medicine.find({
      expiryDate: { $gte: now,$lte: thirtyDaysFromNow }
    }).sort({ expiryDate: 1 });

    res.status(200).json(expiringMedicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addMedicine = async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;

    const newMedicine = new Medicine({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription: requiresPrescription || false,
      expiryDate
    });

    await newMedicine.save();
    res.status(201).json({ message: 'Medicine added successfully', medicine: newMedicine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const updatedMedicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedMedicine) {
      return res.status(404).json({ error: 'Medicine not found.' });
    }

    res.status(200).json({ message: 'Medicine updated successfully', medicine: updatedMedicine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const deletedMedicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!deletedMedicine) {
      return res.status(404).json({ error: 'Medicine not found.' });
    }
    res.status(200).json({ message: 'Medicine deleted successfully from inventory' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};