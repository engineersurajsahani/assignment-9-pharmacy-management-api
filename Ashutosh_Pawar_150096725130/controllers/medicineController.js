const mongoose = require("mongoose");
const Medicine = require("../models/Medicine");
const Order = require("../models/Order");

const DAY_MS = 24 * 60 * 60 * 1000;
const FIELDS = [
  "name",
  "brand",
  "category",
  "dosageForm",
  "price",
  "stockQuantity",
  "requiresPrescription",
  "expiryDate",
];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const handleError = (response, error) => {
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((e) => e.message)
      .join(", ");
    return response.status(400).json({ message });
  }
  if (error.name === "CastError") {
    return response.status(400).json({ message: `Invalid value for ${error.path}!` });
  }
  if (error.code === 11000) {
    return response
      .status(409)
      .json({ message: "A medicine with this name, brand and dosage form already exists!" });
  }
  return response.status(500).json({ message: error.message });
};

const readNumber = (value, fallback, min, max) => {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
};

const getMedicines = async (request, response) => {
  try {
    const { search, category, dosageForm, requiresPrescription, includeExpired } = request.query;
    const filter = {};

    if (search) {
      const pattern = { $regex: escapeRegex(String(search).trim()), $options: "i" };
      filter.$or = [{ name: pattern }, { brand: pattern }, { category: pattern }];
    }
    if (category) {
      filter.category = { $regex: `^${escapeRegex(String(category).trim())}$`, $options: "i" };
    }
    if (dosageForm) {
      filter.dosageForm = dosageForm;
    }
    if (requiresPrescription === "true" || requiresPrescription === "false") {
      filter.requiresPrescription = requiresPrescription === "true";
    }
    if (includeExpired !== "true") {
      filter.expiryDate = { $gt: new Date() };
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 });
    return response.status(200).json({ count: medicines.length, medicines });
  } catch (error) {
    return handleError(response, error);
  }
};

const getCategories = async (request, response) => {
  try {
    const categories = await Medicine.distinct("category");
    return response.status(200).json({ categories: categories.sort() });
  } catch (error) {
    return handleError(response, error);
  }
};

const getMedicineById = async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(404).json({ message: "Medicine not found!" });
    }
    const medicine = await Medicine.findById(request.params.id);
    if (!medicine) {
      return response.status(404).json({ message: "Medicine not found!" });
    }
    return response.status(200).json({ medicine });
  } catch (error) {
    return handleError(response, error);
  }
};

const getExpiringMedicines = async (request, response) => {
  try {
    const days = readNumber(request.query.days, 30, 1, 365);
    if (days === null) {
      return response.status(400).json({ message: "days must be a whole number from 1 to 365!" });
    }

    const now = new Date();
    const limit = new Date(now.getTime() + days * DAY_MS);
    const expiryFilter =
      request.query.includeExpired === "true" ? { $lte: limit } : { $gte: now, $lte: limit };

    const [result] = await Medicine.aggregate([
      { $match: { expiryDate: expiryFilter } },
      {
        $addFields: {
          daysLeft: { $dateDiff: { startDate: now, endDate: "$expiryDate", unit: "day" } },
          stockValue: { $multiply: ["$price", "$stockQuantity"] },
        },
      },
      { $sort: { expiryDate: 1 } },
      {
        $facet: {
          medicines: [{ $project: { __v: 0 } }],
          summary: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalUnits: { $sum: "$stockQuantity" },
                stockValueAtRisk: { $sum: "$stockValue" },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ]);

    return response.status(200).json({
      days,
      summary: result.summary[0] || { count: 0, totalUnits: 0, stockValueAtRisk: 0 },
      medicines: result.medicines,
    });
  } catch (error) {
    return handleError(response, error);
  }
};

const getLowStockMedicines = async (request, response) => {
  try {
    const threshold = readNumber(request.query.threshold, 10, 0, 100000);
    if (threshold === null) {
      return response.status(400).json({ message: "threshold must be a whole number of 0 or more!" });
    }

    const byCategory = await Medicine.aggregate([
      { $match: { stockQuantity: { $lte: threshold } } },
      { $sort: { stockQuantity: 1, name: 1 } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          medicines: {
            $push: {
              _id: "$_id",
              name: "$name",
              brand: "$brand",
              dosageForm: "$dosageForm",
              stockQuantity: "$stockQuantity",
              expiryDate: "$expiryDate",
            },
          },
        },
      },
      { $project: { _id: 0, category: "$_id", count: 1, medicines: 1 } },
      { $sort: { category: 1 } },
    ]);

    const count = byCategory.reduce((sum, group) => sum + group.count, 0);
    return response.status(200).json({ threshold, count, categories: byCategory });
  } catch (error) {
    return handleError(response, error);
  }
};

const createMedicine = async (request, response) => {
  try {
    const missing = FIELDS.filter(
      (field) => field !== "requiresPrescription" && request.body[field] === undefined,
    );
    if (missing.length > 0) {
      return response.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }

    const expiryDate = new Date(request.body.expiryDate);
    if (isNaN(expiryDate.getTime())) {
      return response.status(400).json({ message: "expiryDate is not a valid date!" });
    }
    if (expiryDate.getTime() <= Date.now()) {
      return response.status(400).json({ message: "Cannot add a medicine that is already expired!" });
    }

    const data = {};
    FIELDS.forEach((field) => {
      if (request.body[field] !== undefined) data[field] = request.body[field];
    });

    const medicine = await Medicine.create(data);
    return response.status(201).json({ message: "Medicine added!", medicine });
  } catch (error) {
    return handleError(response, error);
  }
};

const updateMedicine = async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(404).json({ message: "Medicine not found!" });
    }

    const medicine = await Medicine.findById(request.params.id);
    if (!medicine) {
      return response.status(404).json({ message: "Medicine not found!" });
    }

    const changes = FIELDS.filter((field) => request.body[field] !== undefined);
    if (changes.length === 0) {
      return response.status(400).json({ message: `Send at least one of: ${FIELDS.join(", ")}` });
    }
    changes.forEach((field) => {
      medicine[field] = request.body[field];
    });

    await medicine.save();
    return response.status(200).json({ message: "Medicine updated!", medicine });
  } catch (error) {
    return handleError(response, error);
  }
};

const deleteMedicine = async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(404).json({ message: "Medicine not found!" });
    }

    const openOrders = await Order.countDocuments({
      "items.medicine": request.params.id,
      status: { $in: ["pending", "approved"] },
    });
    if (openOrders > 0) {
      return response.status(409).json({
        message: `This medicine is in ${openOrders} open order(s). Finish or cancel them first!`,
      });
    }

    const medicine = await Medicine.findByIdAndDelete(request.params.id);
    if (!medicine) {
      return response.status(404).json({ message: "Medicine not found!" });
    }
    return response.status(200).json({ message: "Medicine deleted!", medicine });
  } catch (error) {
    return handleError(response, error);
  }
};

module.exports = {
  getMedicines,
  getCategories,
  getMedicineById,
  getExpiringMedicines,
  getLowStockMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
