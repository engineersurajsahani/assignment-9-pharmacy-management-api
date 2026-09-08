const Medicine = require('../models/Medicine');

/**
 * @desc    Get expiring medicines aggregation report
 * @route   GET /api/reports/expiring-soon
 * @access  Pharmacist / Admin
 */
const getExpiringSoonReport = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + days);

    // MongoDB Atlas Aggregation Pipeline
    const pipeline = [
      // Step 1: Match medicines expiring between now and the threshold window (e.g., next 30 days)
      {
        $match: {
          expiryDate: {
            $gte: now,
            $lte: thresholdDate
          }
        }
      },
      // Step 2: Add calculated fields for days remaining and financial risk value
      {
        $addFields: {
          daysUntilExpiry: {
            $ceil: {
              $divide: [
                { $subtract: ['$expiryDate', now] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          inventoryRiskValue: {
            $multiply: ['$stockQuantity', '$price']
          }
        }
      },
      // Step 3: Facet to produce both summary analytics and a detailed sorted list
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalExpiringMedicines: { $sum: 1 },
                totalExpiringStockUnits: { $sum: '$stockQuantity' },
                totalFinancialRiskValue: { $sum: '$inventoryRiskValue' }
              }
            }
          ],
          categoryBreakdown: [
            {
              $group: {
                _id: '$category',
                medicineCount: { $sum: 1 },
                totalStock: { $sum: '$stockQuantity' },
                categoryRiskValue: { $sum: '$inventoryRiskValue' }
              }
            },
            { $sort: { categoryRiskValue: -1 } }
          ],
          expiringMedicines: [
            {
              $project: {
                _id: 1,
                name: 1,
                brand: 1,
                category: 1,
                dosageForm: 1,
                price: 1,
                stockQuantity: 1,
                requiresPrescription: 1,
                expiryDate: 1,
                daysUntilExpiry: 1,
                inventoryRiskValue: { $round: ['$inventoryRiskValue', 2] }
              }
            },
            { $sort: { expiryDate: 1 } }
          ]
        }
      }
    ];

    const result = await Medicine.aggregate(pipeline);
    const reportData = result[0] || {};

    const summary = reportData.summary[0] || {
      totalExpiringMedicines: 0,
      totalExpiringStockUnits: 0,
      totalFinancialRiskValue: 0
    };

    return res.status(200).json({
      success: true,
      reportWindowDays: days,
      generatedAt: new Date().toISOString(),
      summary: {
        totalExpiringMedicines: summary.totalExpiringMedicines,
        totalExpiringStockUnits: summary.totalExpiringStockUnits,
        totalFinancialRiskValue: Math.round(summary.totalFinancialRiskValue * 100) / 100
      },
      categoryBreakdown: reportData.categoryBreakdown || [],
      expiringMedicines: reportData.expiringMedicines || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get low-stock inventory aggregation report
 * @route   GET /api/reports/low-stock
 * @access  Pharmacist / Admin
 */
const getLowStockReport = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 15;

    const pipeline = [
      {
        $match: {
          stockQuantity: { $lte: threshold }
        }
      },
      {
        $addFields: {
          stockDeficit: {
            $subtract: [threshold, '$stockQuantity']
          }
        }
      },
      {
        $sort: { stockQuantity: 1 }
      }
    ];

    const lowStockMedicines = await Medicine.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      threshold,
      count: lowStockMedicines.length,
      data: lowStockMedicines
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpiringSoonReport,
  getLowStockReport
};
