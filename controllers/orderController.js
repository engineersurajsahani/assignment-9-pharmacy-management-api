const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// Customer places an order
const createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Order must contain at least one medicine.'
      });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.medicine)) {
        return res.status(400).json({
          message: `Invalid medicine ID: ${item.medicine}`
        });
      }

      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({
          message: 'Quantity must be at least 1.'
        });
      }

      const medicine = await Medicine.findById(item.medicine);

      if (!medicine) {
        return res.status(404).json({
          message: `Medicine not found: ${item.medicine}`
        });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${medicine.name}. Available stock: ${medicine.stockQuantity}`
        });
      }

      if (new Date(medicine.expiryDate) <= new Date()) {
        return res.status(400).json({
          message: `${medicine.name} has expired and cannot be ordered.`
        });
      }

      if (medicine.requiresPrescription && !prescriptionNotes) {
        return res.status(400).json({
          message: `Prescription notes are required for ${medicine.name}.`
        });
      }

      const itemTotal = medicine.price * item.quantity;

      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });

      totalAmount += itemTotal;
    }

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      prescriptionNotes,
      status: 'pending'
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email role')
      .populate('items.medicine');

    res.status(201).json({
      message: 'Order placed successfully.',
      order: populatedOrder
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to place order.',
      error: error.message
    });
  }
};

// Customer views their own orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.user._id
    })
      .populate('items.medicine')
      .sort({ createdAt: -1 });

    res.json({
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch your orders.',
      error: error.message
    });
  }
};

// Pharmacist/Admin views all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email role')
      .populate('items.medicine')
      .sort({ createdAt: -1 });

    res.json({
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch orders.',
      error: error.message
    });
  }
};

// Pharmacist/Admin updates order status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      'pending',
      'approved',
      'dispensed',
      'cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid order status.'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    // Do not allow changes to cancelled orders
    if (order.status === 'cancelled') {
      return res.status(400).json({
        message: 'Cancelled orders cannot be updated.'
      });
    }

    // Prevent stock from being deducted more than once
    const stockAlreadyDeducted =
      order.status === 'approved' ||
      order.status === 'dispensed';

    // Deduct stock when approving/dispensing the order
    if (
      (status === 'approved' || status === 'dispensed') &&
      !stockAlreadyDeducted
    ) {
      for (const item of order.items) {
        const updatedMedicine = await Medicine.findOneAndUpdate(
          {
            _id: item.medicine,
            stockQuantity: { $gte: item.quantity }
          },
          {
            $inc: {
              stockQuantity: -item.quantity
            }
          },
          {
            new: true
          }
        );

        if (!updatedMedicine) {
          return res.status(400).json({
            message: `Insufficient stock for medicine ${item.medicine}. Order was not approved.`
          });
        }
      }
    }

    order.status = status;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email role')
      .populate('items.medicine');

    res.json({
      message: `Order status updated to ${status}.`,
      order: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update order status.',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};