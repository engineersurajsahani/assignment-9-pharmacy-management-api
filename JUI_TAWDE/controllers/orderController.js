const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

exports.createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);

      if (!medicine) {
        return res.status(404).json({ message: `Medicine not found: ${item.medicine}` });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${medicine.name}`
        });
      }

      if (medicine.requiresPrescription && !prescriptionNotes) {
        return res.status(400).json({
          message: `${medicine.name} requires prescription notes`
        });
      }

      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });

      totalAmount += medicine.price * item.quantity;
    }

    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      prescriptionNotes
    });

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand price stockQuantity')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { status } = req.body;
    if (!['approved', 'dispensed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status === 'approved') {
      if (order.status !== 'pending') {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Only pending orders can be approved' });
      }

      for (const item of order.items) {
        const updated = await Medicine.findOneAndUpdate(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true, session }
        );

        if (!updated) {
          await session.abortTransaction();
          return res.status(400).json({
            message: 'Insufficient stock for one or more medicines'
          });
        }
      }
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();

    const result = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand price stockQuantity');

    res.json({ message: `Order ${status} successfully`, order: result });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
