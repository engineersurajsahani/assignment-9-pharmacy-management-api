const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

const createOrder = async (req, res, next) => {
  try {
    const { items, prescriptionNotes } = req.body;
    const customer = req.user._id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required' });
    }

    let totalAmount = 0;
    const populatedItems = [];

    for (const item of items) {
      const med = await Medicine.findById(item.medicine);
      if (!med) {
        return res.status(404).json({
          success: false,
          message: `Medicine with ID '${item.medicine}' not found`
        });
      }

      if (med.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${med.name}'. Available: ${med.stockQuantity}`
        });
      }

      totalAmount += med.price * item.quantity;
      populatedItems.push({
        medicine: med._id,
        quantity: item.quantity,
        unitPrice: med.price
      });
    }

    const order = new Order({
      customer,
      items: populatedItems,
      totalAmount,
      prescriptionNotes,
      status: 'pending'
    });

    await order.save();

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'dispensed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if ((status === 'approved' || status === 'dispensed') && order.status === 'pending') {
      for (const item of order.items) {
        const med = await Medicine.findById(item.medicine);
        if (!med || med.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve: Insufficient stock for ${med ? med.name : 'item'}`
          });
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

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};
