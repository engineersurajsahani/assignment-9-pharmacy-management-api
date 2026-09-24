const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// @desc    Place a new medicine order
// @route   POST /api/orders
// @access  Private (Customer Only)
exports.createOrder = async (req, res, next) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item',
      });
    }

    let calculatedTotal = 0;
    const processedItems = [];
    let prescriptionRequiredForOrder = false;

    // Validate each item and fetch current medicine price & stock
    for (const item of items) {
      const medicineId = item.medicineId || item.medicine;
      const quantity = parseInt(item.quantity, 10);

      if (!medicineId) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicine ID',
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: `Quantity for medicine ${medicineId} must be at least 1`,
        });
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine with ID ${medicineId} not found in catalog`,
        });
      }

      // Check if stock is sufficient
      if (medicine.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicine.name}'. Available: ${medicine.stockQuantity}, Requested: ${quantity}`,
        });
      }

      // Check if medicine requires prescription
      if (medicine.requiresPrescription) {
        prescriptionRequiredForOrder = true;
      }

      const unitPrice = medicine.price;
      calculatedTotal += unitPrice * quantity;

      processedItems.push({
        medicine: medicine._id,
        quantity,
        unitPrice,
      });
    }

    // Prescription validation: If any medicine requires prescription, prescriptionNotes is mandatory
    if (prescriptionRequiredForOrder && (!prescriptionNotes || prescriptionNotes.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'One or more items require a doctor prescription. Please provide prescriptionNotes.',
      });
    }

    // Create the order with 'pending' status (do not decrement stock yet)
    const order = await Order.create({
      customer: req.user.id,
      items: processedItems,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      prescriptionNotes: prescriptionNotes ? prescriptionNotes.trim() : undefined,
      status: 'pending',
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('items.medicine', 'name brand category dosageForm price requiresPrescription')
      .populate('customer', 'name email');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully with pending status',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order history for logged-in customer
// @route   GET /api/orders/my-orders
// @access  Private (Customer Only)
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand category dosageForm price')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders across system
// @route   GET /api/orders
// @access  Private (Pharmacist, Admin)
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand category dosageForm price requiresPrescription')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        totalItems: totalOrders,
        totalPages: Math.ceil(totalOrders / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private (Customer, Pharmacist, Admin)
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand category dosageForm price requiresPrescription');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with id ${req.params.id}`,
      });
    }

    // Role check: customer can only view their own orders
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this order',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Approve / Dispense / Cancel) with atomic stock deduction
// @route   PATCH /api/orders/:id/status
// @access  Private (Pharmacist, Admin)
exports.updateOrderStatus = async (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Please provide status to update',
    });
  }

  const validStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
    });
  }

  // Attempt transaction session for atomic updates
  let session = null;
  let useTransactions = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransactions = true;
  } catch (sessionErr) {
    // If running in standalone MongoDB environment without replica set transactions
    useTransactions = false;
    session = null;
  }

  try {
    const orderQuery = Order.findById(req.params.id);
    if (useTransactions) {
      orderQuery.session(session);
    }
    const order = await orderQuery;

    if (!order) {
      if (useTransactions) await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: `Order not found with id ${req.params.id}`,
      });
    }

    const previousStatus = order.status;

    // Handle transition to 'approved'
    if (status === 'approved' && previousStatus !== 'approved' && previousStatus !== 'dispensed') {
      // 1. Check current inventory for all items
      for (const item of order.items) {
        const medQuery = Medicine.findById(item.medicine);
        if (useTransactions) medQuery.session(session);
        const med = await medQuery;

        if (!med) {
          if (useTransactions) await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Medicine with ID ${item.medicine} no longer exists`,
          });
        }

        if (med.stockQuantity < item.quantity) {
          if (useTransactions) await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for '${med.name}' at approval time. Available: ${med.stockQuantity}, Required: ${item.quantity}`,
          });
        }
      }

      // 2. Atomically decrement stock
      for (const item of order.items) {
        const updateOptions = { new: true };
        if (useTransactions) updateOptions.session = session;

        const updatedMedicine = await Medicine.findOneAndUpdate(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          updateOptions
        );

        if (!updatedMedicine) {
          if (useTransactions) await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Stock update failed during atomic deduction for item ${item.medicine}. Stock may have changed concurrently.`,
          });
        }
      }
    }

    // Handle transition to 'cancelled' if previously approved or dispensed (restore stock)
    if (status === 'cancelled' && (previousStatus === 'approved' || previousStatus === 'dispensed')) {
      for (const item of order.items) {
        const updateOptions = { new: true };
        if (useTransactions) updateOptions.session = session;

        await Medicine.findByIdAndUpdate(
          item.medicine,
          { $inc: { stockQuantity: item.quantity } },
          updateOptions
        );
      }
    }

    // Update order status
    order.status = status;
    if (useTransactions) {
      await order.save({ session });
      await session.commitTransaction();
    } else {
      await order.save();
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand category dosageForm price stockQuantity');

    res.status(200).json({
      success: true,
      message: `Order status successfully updated from '${previousStatus}' to '${status}'`,
      data: updatedOrder,
    });
  } catch (error) {
    if (useTransactions && session) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};
