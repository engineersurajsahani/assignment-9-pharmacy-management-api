const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const { asyncHandler, AppError } = require('../utils/errors');

const createOrder = asyncHandler(async (req, res, next) => {
  const { items, prescriptionNotes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return next(new AppError('Order must contain at least one item', 400));
  }

  const medicineIds = items.map((item) => item.medicine);
  const medicines = await Medicine.find({ _id: { $in: medicineIds } });

  if (medicines.length !== new Set(medicineIds.map(String)).size) {
    return next(new AppError('One or more medicines could not be found', 404));
  }

  const medicineMap = new Map(medicines.map((m) => [m._id.toString(), m]));

  const needsPrescription = medicines.some((m) => m.requiresPrescription);
  if (needsPrescription && !prescriptionNotes) {
    return next(
      new AppError(
        'This order contains prescription-only medicines. prescriptionNotes is required for pharmacist verification.',
        400
      )
    );
  }

  let totalAmount = 0;
  const orderItems = items.map(({ medicine, quantity }) => {
    const med = medicineMap.get(medicine.toString());
    const qty = parseInt(quantity, 10);

    if (!med) {
      throw new AppError('One or more medicines could not be found', 404);
    }
    if (!Number.isInteger(qty) || qty < 1) {
      throw new AppError('Quantity must be a positive integer', 400);
    }
    if (qty > med.stockQuantity) {
      throw new AppError(
        `Insufficient stock for "${med.name}". Available: ${med.stockQuantity}`,
        400
      );
    }

    totalAmount += qty * med.price;
    return { medicine: med._id, quantity: qty, unitPrice: med.price };
  });

  const order = await Order.create({
    customer: req.user._id,
    items: orderItems,
    totalAmount,
    prescriptionNotes: prescriptionNotes || undefined
  });

  const populated = await Order.findById(order._id)
    .populate('items.medicine', 'name brand category dosageForm')
    .populate('customer', 'name email');

  res.status(201).json({
    success: true,
    message: 'Order placed. Awaiting pharmacist approval.',
    data: populated
  });
});

const getMyOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate('items.medicine', 'name brand category dosageForm')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// @desc    List all orders (Pharmacist/Admin). Optional status filter.
// @route   GET /api/orders
const getAllOrders = asyncHandler(async (req, res, next) => {
  const { status } = req.query;
  const match = {};
  if (status) match.status = status;

  const orders = await Order.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer'
      }
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'medicines',
        localField: 'items.medicine',
        foreignField: '_id',
        as: 'medicineDetails'
      }
    },
    {
      $project: {
        _id: 1,
        customer: { _id: 1, name: 1, email: 1 },
        totalAmount: 1,
        prescriptionNotes: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        items: {
          $map: {
            input: '$items',
            as: 'item',
            in: {
              quantity: '$$item.quantity',
              unitPrice: '$$item.unitPrice',
              medicine: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$medicineDetails',
                      as: 'md',
                      cond: { $eq: ['$$md._id', '$$item.medicine'] }
                    }
                  },
                  0
                ]
              }
            }
          }
        },
        summary: {
          totalItems: { $sum: '$items.quantity' }
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const allowed = ['pending', 'approved', 'dispensed', 'cancelled'];

  if (!status || !allowed.includes(status)) {
    return next(
      new AppError(
        `Status must be one of: ${allowed.join(', ')}`,
        400
      )
    );
  }

  const order = await Order.findById(req.params.id).populate(
    'items.medicine'
  );

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  const current = order.status;
  const validTransitions = {
    pending: ['approved', 'dispensed', 'cancelled'],
    approved: ['dispensed', 'cancelled'],
    dispensed: [],
    cancelled: []
  };

  if (!validTransitions[current].includes(status)) {
    return next(
      new AppError(
        `Cannot transition order from '${current}' to '${status}'`,
        400
      )
    );
  }

  if (current === 'pending' && status === 'approved') {
    for (const item of order.items) {
      if (!item.medicine) {
        return next(new AppError('Order contains an invalid medicine reference', 400));
      }

      const result = await Medicine.findOneAndUpdate(
        {
          _id: item.medicine._id,
          stockQuantity: { $gte: item.quantity }
        },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true }
      );

      if (!result) {
        return next(
          new AppError(
            `Cannot approve: insufficient stock for "${item.medicine.name}" (${item.quantity} units requested).`,
            409
          )
        );
      }
    }
  }

  order.status = status;
  order.processedBy = req.user._id;
  await order.save();

  res.status(200).json({
    success: true,
    message:
      status === 'approved'
        ? 'Order approved. Medicine stock has been deducted.'
        : `Order status updated to '${status}'.`,
    data: order
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};