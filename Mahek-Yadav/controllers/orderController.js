const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, prescriptionNotes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'items array is required' });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine).session(session);
      if (!medicine) throw new Error(`Medicine not found: ${item.medicine}`);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be a positive integer');
      if (medicine.stockQuantity < quantity) throw new Error(`Insufficient stock for ${medicine.name}`);
      if (medicine.requiresPrescription && !prescriptionNotes) throw new Error(`Prescription notes required for ${medicine.name}`);

      orderItems.push({ medicine: medicine._id, quantity, unitPrice: medicine.price });
      totalAmount += medicine.price * quantity;
    }

    const [order] = await Order.create([{
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      prescriptionNotes
    }], { session });

    await session.commitTransaction();
    res.status(201).json({ message: 'Order placed', order });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: 'Could not place order', error: error.message });
  } finally {
    session.endSession();
  }
};

exports.myOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id }).populate('items.medicine', 'name brand price').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch orders', error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('customer', 'name email').populate('items.medicine', 'name brand').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch orders', error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    if (!['approved', 'dispensed', 'cancelled'].includes(status)) throw new Error('Invalid status');

    const order = await Order.findById(req.params.id).session(session);
    if (!order) throw new Error('Order not found');

    if (status === 'approved') {
      if (order.status !== 'pending') throw new Error('Only pending orders can be approved');

      for (const item of order.items) {
        const medicine = await Medicine.findOneAndUpdate(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true, session }
        );
        if (!medicine) throw new Error('Insufficient stock while approving order');
      }
    }

    if (status === 'dispensed' && order.status !== 'approved') throw new Error('Only approved orders can be dispensed');

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();
    res.json({ message: `Order ${status}`, order });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: 'Could not update order status', error: error.message });
  } finally {
    session.endSession();
  }
};
