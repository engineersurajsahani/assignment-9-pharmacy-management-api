const Medicine = require("../models/Medicine");

// @desc   Get medicines expiring within the next 30 days
// @route  GET /api/reports/expiring-soon
// @access pharmacist, admin
const getExpiringSoon = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const expiring = await Medicine.find({
      expiryDate: { $gte: today, $lte: thirtyDaysLater },
    }).sort({ expiryDate: 1 });

    return res.status(200).json({
      success: true,
      message: "Medicines expiring within the next 30 days.",
      data: expiring,
      meta: {
        from: today,
        to: thirtyDaysLater,
        count: expiring.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Get medicines with stock below a configurable threshold
// @route  GET /api/reports/low-stock
// @access pharmacist, admin
const getLowStockMedicines = async (req, res) => {
  try {
    // Default threshold is 10, can be overridden via ?threshold=
    let threshold = Number(req.query.threshold) || 10;

    if (threshold < 0) {
      return res.status(400).json({
        success: false,
        message: "Threshold cannot be negative.",
      });
    }

    // Use aggregation to filter low-stock medicines and enrich the result
    const lowStock = await Medicine.aggregate([
      {
        $match: { stockQuantity: { $lt: threshold } },
      },
      {
        $addFields: {
          lowStockLabel: {
            $cond: {
              if: { $lte: ["$stockQuantity", 0] },
              then: "out of stock",
              else: {
                $cond: {
                  if: { $lte: ["$stockQuantity", threshold / 2] },
                  then: "critically low",
                  else: "low",
                },
              },
            },
          },
        },
      },
      {
        $sort: { stockQuantity: 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: `Medicines with stock below ${threshold}.`,
      data: lowStock,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { getLowStockMedicines, getExpiringSoon };