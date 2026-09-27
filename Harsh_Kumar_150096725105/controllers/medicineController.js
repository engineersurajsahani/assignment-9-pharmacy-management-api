const Medicine = require('../models/Medicine');

exports.getMedicines = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category) filter.category = new RegExp(category, 'i');
    if (search) filter.name = new RegExp(search, 'i');

    const medicines = await Medicine.find(filter);
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getExpiringMedicines = async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiring = await Medicine.find({
      expiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
    });
    
    res.json(expiring);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addMedicine = async (req, res) => {
  try {
    const { name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate } = req.body;
    
    if (!name || !brand || !category || !dosageForm || price == null || stockQuantity == null || !expiryDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const medicine = new Medicine({
      name, brand, category, dosageForm, price, stockQuantity, requiresPrescription, expiryDate
    });

    await medicine.save();
    res.status(201).json(medicine);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
