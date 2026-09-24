const Medicine = require("../models/Medicine");

// Get all medicines with optional search and category filter
const getMedicines = async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    const medicines = await Medicine.find(query).sort({ createdAt: -1 });
    res.status(200).json({ count: medicines.length, medicines });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get medicines expiring in the next 30 days
const getExpiringMedicines = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const expiringMedicines = await Medicine.find({
      expiryDate: {
        $gte: today,
        $lte: thirtyDaysLater,
      },
    }).sort({ expiryDate: 1 });

    res.status(200).json({
      count: expiringMedicines.length,
      expiringMedicines,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single medicine by ID
const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found." });
    }
    res.status(200).json({ medicine });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new medicine (Pharmacist / Admin)
const addMedicine = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription,
      expiryDate,
    } = req.body;

    if (
      !name ||
      !brand ||
      !category ||
      !dosageForm ||
      price === undefined ||
      stockQuantity === undefined ||
      !expiryDate
    ) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    const medicine = await Medicine.create({
      name,
      brand,
      category,
      dosageForm,
      price,
      stockQuantity,
      requiresPrescription: requiresPrescription || false,
      expiryDate,
    });

    res.status(201).json({
      message: "Medicine added successfully.",
      medicine,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update medicine details or stock (Pharmacist / Admin)
const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found." });
    }

    res.status(200).json({
      message: "Medicine updated successfully.",
      medicine,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete medicine (Admin only)
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found." });
    }

    res.status(200).json({ message: "Medicine deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMedicines,
  getExpiringMedicines,
  getMedicineById,
  addMedicine,
  updateMedicine,
  deleteMedicine,
};
