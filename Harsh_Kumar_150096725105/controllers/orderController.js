const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

exports.placeOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain items' });
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({ message: `Medicine ${item.medicine} not found` });
      }
      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${medicine.name}` });
      }
      
      const itemTotal = medicine.price * item.quantity;
      totalAmount += itemTotal;
      
      processedItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });
    }

    const order = new Order({
      customer: req.user.userId,
      items: processedItems,
      totalAmount,
      prescriptionNotes
    });

    await order.save();
    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.userId }).populate('items.medicine', 'name brand');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('customer', 'username email').populate('items.medicine', 'name brand');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'dispensed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (status === 'approved' && order.status === 'pending') {
      // Deduct stock
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: -item.quantity }
        });
      }
    } else if (status === 'cancelled' && (order.status === 'approved' || order.status === 'dispensed')) {
      // Restore stock if cancelled after approval
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: item.quantity }
        });
      }
    }

    order.status = status;
    await order.save();
    
    res.json({ message: `Order status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
