const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// @desc    Place a new customer order
// @route   POST /api/orders
// @access  Private (Customer)
const createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one medicine item in your order.'
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (!item.medicine || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicine ID and quantity of at least 1.'
        });
      }

      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found with ID: ${item.medicine}`
        });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicine.name}'. Available: ${medicine.stockQuantity}, Requested: ${item.quantity}`
        });
      }

      const itemTotal = medicine.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });
    }

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      prescriptionNotes,
      status: 'pending'
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand category price dosageForm');

    res.status(201).json({
      success: true,
      data: populatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get logged in customer's order history
// @route   GET /api/orders/my-orders
// @access  Private (Customer)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand category price dosageForm')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    List all pending & processed orders
// @route   GET /api/orders
// @access  Private (Pharmacist / Admin)
const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone address')
      .populate('items.medicine', 'name brand category price dosageForm stockQuantity')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update order status (Approve / Dispense / Cancel) & trigger stock deduction
// @route   PATCH /api/orders/:id/status
// @access  Private (Pharmacist / Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID: ${req.params.id}`
      });
    }

    // Trigger atomic stock deduction if transitioning from pending to approved or dispensed
    if ((status === 'approved' || status === 'dispensed') && order.status === 'pending') {
      // Step 1: Verify current stock for all items
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine);
        if (!medicine) {
          return res.status(400).json({
            success: false,
            message: `Order approval failed. Medicine with ID ${item.medicine} no longer exists.`
          });
        }

        if (medicine.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Order approval failed. Insufficient stock for '${medicine.name}'. Available: ${medicine.stockQuantity}, Required: ${item.quantity}`
          });
        }
      }

      // Step 2: Perform atomic decrements
      for (const item of order.items) {
        const updateResult = await Medicine.updateOne(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } }
        );

        if (updateResult.modifiedCount === 0) {
          return res.status(400).json({
            success: false,
            message: `Stock update failed during atomic deduction for item ${item.medicine}.`
          });
        }
      }
    }

    order.status = status;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone address')
      .populate('items.medicine', 'name brand category price dosageForm stockQuantity');

    res.status(200).json({
      success: true,
      message: `Order status successfully updated to '${status}'.`,
      data: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};
