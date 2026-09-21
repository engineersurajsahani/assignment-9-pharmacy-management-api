const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const mongoose = require('mongoose');

const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Order items are required.'
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine).session(session);

      if (!medicine) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: `Medicine with ID ${item.medicine} not found.`
        });
      }

      if (medicine.stockQuantity < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}`
        });
      }

      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });

      totalAmount += medicine.price * item.quantity;
    }

    const order = new Order({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      prescriptionNotes,
      status: 'pending'
    });

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'username email')
      .populate('items.medicine', 'name brand price');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully. Waiting for approval.',
      data: populatedOrder
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).json({
      success: false,
      message: 'Failed to place order.',
      error: error.message
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders.',
      error: error.message
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('customer', 'username email')
      .populate('items.medicine', 'name brand price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders.',
      error: error.message
    });
  }
};

const updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    const { id } = req.params;

    const order = await Order.findById(id).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    if (order.status === 'approved' || order.status === 'dispensed' || order.status === 'cancelled') {
      if (order.status !== 'pending') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Order already ${order.status}. Cannot change status.`
        });
      }
    }

    if (status === 'approved' && order.status === 'pending') {
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine).session(session);

        if (!medicine) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({
            success: false,
            message: 'Medicine not found.'
          });
        }

        if (medicine.stockQuantity < item.quantity) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}`
          });
        }

        medicine.stockQuantity -= item.quantity;
        await medicine.save({ session });
      }
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    const updatedOrder = await Order.findById(id)
      .populate('customer', 'username email')
      .populate('items.medicine', 'name brand price');

    res.json({
      success: true,
      message: `Order status updated to ${status}.`,
      data: updatedOrder
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).json({
      success: false,
      message: 'Failed to update order status.',
      error: error.message
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'username email')
      .populate('items.medicine', 'name brand price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    if (req.user.role === 'Customer' && order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own orders.'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order.',
      error: error.message
    });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById
};
