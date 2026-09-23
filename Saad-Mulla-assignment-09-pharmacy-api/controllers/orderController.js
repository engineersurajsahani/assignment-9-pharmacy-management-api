const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

exports.placeOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({ error: 'Medicine with ID ' + item.medicine + ' not found.' });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({ error: 'Insufficient stock for ' + medicine.name + '. Available: ' + medicine.stockQuantity });
      }

      const unitPrice = medicine.price;
      totalAmount += unitPrice * item.quantity;

      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice
      });
    }

    const newOrder = new Order({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      prescriptionNotes
    });

    await newOrder.save();
    res.status(201).json({ message: 'Order placed successfully', order: newOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand dosageForm price')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'username email')
      .populate('items.medicine', 'name brand price stockQuantity')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'dispensed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid order status value.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if ((status === 'approved' || status === 'dispensed') && order.status === 'pending') {
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine);
        if (!medicine || medicine.stockQuantity < item.quantity) {
          return res.status(400).json({ error: 'Cannot approve order: Insufficient stock for medicine ' + (medicine ? medicine.name : item.medicine) });
        }
      }

      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: -item.quantity }
        });
      }
    }

    order.status = status;
    await order.save();

    res.status(200).json({ message: 'Order status updated to ' + status, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};