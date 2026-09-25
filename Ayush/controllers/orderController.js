const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

const createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must include at least one item' });
    }

    let totalAmount = 0;
    const orderItems = [];
    let needsPrescriptionNote = false;

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({ success: false, message: `Medicine not found: ${item.medicine}` });
      }

      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ success: false, message: 'Each item requires a quantity of at least 1' });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}`,
        });
      }

      if (medicine.requiresPrescription) needsPrescriptionNote = true;

      const unitPrice = medicine.price;
      totalAmount += unitPrice * item.quantity;

      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice,
      });
    }

    if (needsPrescriptionNote && !prescriptionNotes) {
      return res.status(400).json({
        success: false,
        message: 'One or more items require a prescription. Please include prescriptionNotes.',
      });
    }

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      prescriptionNotes,
      status: 'pending',
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand dosageForm')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const orders = await Order.find(filter)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand dosageForm')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${allowedStatuses.join(', ')}` });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isFirstApproval = status === 'approved' && order.status !== 'approved';

    if (isFirstApproval) {


      for (const item of order.items) {
        const updated = await Medicine.findOneAndUpdate(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true, session }
        );

        if (!updated) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: `Cannot approve order: insufficient stock for medicine ${item.medicine}`,
          });
        }
      }
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createOrder, getMyOrders, getAllOrders, updateOrderStatus };
