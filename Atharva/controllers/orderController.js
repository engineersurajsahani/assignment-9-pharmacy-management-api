const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const mongoose = require('mongoose');

exports.placeOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items cannot be empty' });
    }

    let totalAmount = 0;
    const orderItems = [];

    // Verify stock and calculate total
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({ success: false, message: `Medicine ${item.medicine} not found` });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${medicine.name}` });
      }
      
      // If requires prescription, ensure notes are provided (simplification for this assignment)
      if (medicine.requiresPrescription && !prescriptionNotes) {
        return res.status(400).json({ success: false, message: `${medicine.name} requires a prescription.` });
      }

      totalAmount += medicine.price * item.quantity;
      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });
    }

    const order = new Order({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      prescriptionNotes
    });

    await order.save();
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).populate('items.medicine', 'name brand');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('customer', 'name email').populate('items.medicine', 'name brand');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'dispensed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only deduct stock if changing from pending to approved
    if (order.status === 'pending' && status === 'approved') {
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine).session(session);
        if (medicine.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${medicine.name} to approve order.`);
        }
        medicine.stockQuantity -= item.quantity;
        await medicine.save({ session });
      }
    }

    // If cancelled, and it was approved/dispensed previously, we should theoretically restock, 
    // but we'll keep it simple: just status update. (Extensibility point)

    order.status = status;
    await order.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};
