const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/orders
// @desc    Customer places a new medicine order
// @access  Private (customer only)
// ─────────────────────────────────────────────────────────────────────────────
const placeOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
      });
    }

    // Validate each item and fetch current medicine prices
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { medicine: medicineId, quantity } = item;

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(medicineId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid medicine ID: ${medicineId}`,
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a quantity of at least 1.',
        });
      }

      // Fetch the medicine to get current price & check existence
      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found: ${medicineId}`,
        });
      }

      // Check stock availability at order placement time
      if (medicine.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${medicine.name}". Available: ${medicine.stockQuantity}, Requested: ${quantity}`,
        });
      }

      const unitPrice = medicine.price;
      totalAmount += unitPrice * quantity;

      orderItems.push({
        medicine: medicine._id,
        quantity,
        unitPrice,
      });
    }

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      prescriptionNotes: prescriptionNotes || '',
      status: 'pending',
    });

    // Populate for response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand category dosageForm price');

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully. Awaiting pharmacist approval.',
      data: { order: populatedOrder },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error placing order.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/orders/my-orders
// @desc    Get the authenticated customer's own orders
// @access  Private (customer only)
// ─────────────────────────────────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand category dosageForm price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Your orders retrieved successfully.',
      count: orders.length,
      data: { orders },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching your orders.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/orders
// @desc    Get all orders (pharmacist/admin view)
// @access  Private (pharmacist, admin)
// ─────────────────────────────────────────────────────────────────────────────
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand category dosageForm price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'All orders retrieved successfully.',
      count: orders.length,
      data: { orders },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching all orders.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/orders/:id/status
// @desc    Update order status; deducts stock atomically when status → approved
// @access  Private (pharmacist, admin)
// ─────────────────────────────────────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format.',
      });
    }

    // Validate status value
    const validStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}.`,
      });
    }

    // Fetch the order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const previousStatus = order.status;

    // ── Stock Deduction Logic ────────────────────────────────────────────────
    // Only deduct stock when transitioning TO 'approved' for the FIRST TIME.
    // This prevents double-deduction if the endpoint is called again on an
    // already-approved order.
    if (status === 'approved' && previousStatus !== 'approved') {
      for (const item of order.items) {
        // Atomic update: only succeeds if stockQuantity >= item.quantity
        const updatedMedicine = await Medicine.findOneAndUpdate(
          {
            _id: item.medicine,
            stockQuantity: { $gte: item.quantity },
          },
          {
            $inc: { stockQuantity: -item.quantity },
          },
          { new: true }
        );

        if (!updatedMedicine) {
          // Stock is insufficient for this medicine
          const medicine = await Medicine.findById(item.medicine);
          const availableStock = medicine ? medicine.stockQuantity : 0;
          const medicineName = medicine ? medicine.name : item.medicine;

          return res.status(400).json({
            success: false,
            message: `Insufficient stock to approve order. Medicine: "${medicineName}" has ${availableStock} units available but ${item.quantity} are required.`,
          });
        }
      }
    }
    // ── End Stock Deduction Logic ────────────────────────────────────────────

    // Update the order status
    order.status = status;
    await order.save();

    // Populate for response
    const updatedOrder = await Order.findById(id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand category dosageForm price stockQuantity');

    return res.status(200).json({
      success: true,
      message: `Order status updated to "${status}" successfully.`,
      data: { order: updatedOrder },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error updating order status.',
      error: error.message,
    });
  }
};

module.exports = { placeOrder, getMyOrders, getAllOrders, updateOrderStatus };
