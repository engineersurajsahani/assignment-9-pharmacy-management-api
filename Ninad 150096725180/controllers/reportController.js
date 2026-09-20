const Medicine = require('../models/Medicine');
const Order = require('../models/Order');

// @desc    Get medicines expiring soon (next 30 days) - Aggregation report
// @route   GET /api/reports/expiring-soon
// @access  Pharmacist / Admin
const getExpiringSoonReport = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const report = await Medicine.aggregate([
      {
        $match: {
          expiryDate: { $lte: futureDate }
        }
      },
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          dosageForm: 1,
          price: 1,
          stockQuantity: 1,
          expiryDate: 1,
          requiresPrescription: 1,
          status: {
            $cond: [
              { $lt: ['$expiryDate', today] },
              'Expired',
              'Expiring Soon'
            ]
          },
          daysRemaining: {
            $round: [
              {
                $divide: [
                  { $subtract: ['$expiryDate', today] },
                  1000 * 60 * 60 * 24
                ]
              },
              0
            ]
          }
        }
      },
      {
        $sort: { expiryDate: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: report.length,
      timeframeDays: days,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock inventory alert report (Aggregation)
// @route   GET /api/reports/low-stock
// @access  Pharmacist / Admin
const getLowStockReport = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 15;

    const lowStockMedicines = await Medicine.aggregate([
      {
        $match: {
          stockQuantity: { $lte: threshold }
        }
      },
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          dosageForm: 1,
          price: 1,
          stockQuantity: 1,
          inventoryStatus: {
            $cond: [
              { $eq: ['$stockQuantity', 0] },
              'Out of Stock',
              'Low Stock'
            ]
          }
        }
      },
      {
        $sort: { stockQuantity: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      threshold,
      count: lowStockMedicines.length,
      data: lowStockMedicines
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory summary analytics
// @route   GET /api/reports/inventory-summary
// @access  Pharmacist / Admin
const getInventorySummary = async (req, res, next) => {
  try {
    const summary = await Medicine.aggregate([
      {
        $group: {
          _id: '$category',
          totalMedicines: { $sum: 1 },
          totalUnitsInStock: { $sum: '$stockQuantity' },
          totalInventoryValue: { $sum: { $multiply: ['$price', '$stockQuantity'] } },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $project: {
          category: '$_id',
          _id: 0,
          totalMedicines: 1,
          totalUnitsInStock: 1,
          totalInventoryValue: { $round: ['$totalInventoryValue', 2] },
          avgPrice: { $round: ['$avgPrice', 2] }
        }
      },
      {
        $sort: { totalUnitsInStock: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpiringSoonReport,
  getLowStockReport,
  getInventorySummary
};
