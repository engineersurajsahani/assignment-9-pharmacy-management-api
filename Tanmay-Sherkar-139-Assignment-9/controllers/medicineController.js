const Medicine = require('../models/Medicine');
const { asyncHandler, AppError } = require('../utils/errors');

const getMedicines = asyncHandler(async (req, res, next) => {
  const { search, category, requiresPrescription, sortBy } = req.query;

  const query = {};

  if (category) query.category = category;

  if (requiresPrescription !== undefined) {
    query.requiresPrescription = requiresPrescription === 'true';
  }

  if (search) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { name: regex },
      { brand: regex },
      { category: regex }
    ];
  }

  const sortOptions = {
    newest: '-createdAt',
    priceAsc: 'price',
    priceDesc: '-price',
    nameAsc: 'name',
    default: '-createdAt'
  };
  const sort = sortOptions[sortBy] || sortOptions.default;

  const medicines = await Medicine.find(query).sort(sort);

  res.status(200).json({
    success: true,
    count: medicines.length,
    data: medicines
  });
});

const getExpiringMedicines = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const daysFromNowParam = parseInt(req.query.days, 10) || 30;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + daysFromNowParam);

  const medicines = await Medicine.aggregate([
    {
      $match: {
        expiryDate: { $gte: now, $lte: cutoff },
        stockQuantity: { $gt: 0 }
      }
    },
    {
      $addFields: {
        daysUntilExpiry: {
          $ceil: {
            $divide: [
              { $subtract: ['$expiryDate', now] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    },
    { $sort: { daysUntilExpiry: 1 } }
  ]);

  res.status(200).json({
    success: true,
    count: medicines.length,
    daysWindow: daysFromNowParam,
    data: medicines
  });
});

const getLowStockMedicines = asyncHandler(async (req, res, next) => {
  const threshold = parseInt(req.query.threshold, 10) || 10;

  const medicines = await Medicine.aggregate([
    { $match: { stockQuantity: { $lt: threshold } } },
    {
      $project: {
        name: 1,
        brand: 1,
        category: 1,
        stockQuantity: 1,
        requiresPrescription: 1,
        price: 1,
        expiryDate: 1,
        reorderQuantity: {
          $subtract: [threshold * 3, '$stockQuantity']
        }
      }
    },
    { $sort: { stockQuantity: 1 } }
  ]);

  res.status(200).json({
    success: true,
    count: medicines.length,
    threshold,
    data: medicines
  });
});

const createMedicine = asyncHandler(async (req, res, next) => {
  const {
    name,
    brand,
    category,
    dosageForm,
    price,
    stockQuantity,
    requiresPrescription,
    expiryDate
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
    return next(
      new AppError(
        'Missing required fields: name, brand, category, dosageForm, price, stockQuantity, expiryDate',
        400
      )
    );
  }

  const medicine = await Medicine.create({
    name,
    brand,
    category,
    dosageForm,
    price,
    stockQuantity,
    requiresPrescription,
    expiryDate
  });

  res.status(201).json({
    success: true,
    message: 'Medicine added to inventory',
    data: medicine
  });
});

const updateMedicine = asyncHandler(async (req, res, next) => {
  const medicine = await Medicine.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!medicine) {
    return next(new AppError('Medicine not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Medicine updated',
    data: medicine
  });
});

const deleteMedicine = asyncHandler(async (req, res, next) => {
  const medicine = await Medicine.findByIdAndDelete(req.params.id);

  if (!medicine) {
    return next(new AppError('Medicine not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Medicine removed from inventory'
  });
});

module.exports = {
  getMedicines,
  getExpiringMedicines,
  getLowStockMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine
};