const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

/**
 * @desc    Place a new order
 * @route   POST /api/orders
 * @access  Private (Customer Only)
 */
const createOrder = async (req, res, next) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one medicine item with quantity'
      });
    }

    const processedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      if (!item.medicine || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicine ID and a quantity >= 1'
        });
      }

      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found for ID: ${item.medicine}`
        });
      }

      // Check stock availability
      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicine.name}'. Available: ${medicine.stockQuantity}, Requested: ${item.quantity}`
        });
      }

      // Check prescription requirement
      if (medicine.requiresPrescription && (!prescriptionNotes || !prescriptionNotes.trim())) {
        return res.status(400).json({
          success: false,
          message: `'${medicine.name}' requires a doctor's prescription. Please provide details in 'prescriptionNotes'.`
        });
      }

      const unitPrice = medicine.price;
      const subtotal = unitPrice * item.quantity;
      calculatedTotal += subtotal;

      processedItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: unitPrice
      });
    }

    const order = await Order.create({
      customer: req.user._id,
      items: processedItems,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      prescriptionNotes: prescriptionNotes || '',
      status: 'pending'
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('items.medicine', 'name brand category price dosageForm');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully. Waiting for Pharmacist / Admin approval.',
      data: populatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order history for logged in customer
 * @route   GET /api/orders/my-orders
 * @access  Private (Customer Only)
 */
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand dosageForm price category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders (pending & processed)
 * @route   GET /api/orders
 * @access  Private (Pharmacist / Admin)
 */
const getAllOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) {
      query.status = status.toLowerCase();
    }

    const orders = await Order.find(query)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand category price stockQuantity')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status with atomic stock deduction upon approval
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Pharmacist / Admin)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];

    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const newStatus = status.toLowerCase();
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID: ${req.params.id}`
      });
    }

    const oldStatus = order.status;

    // Transition logic & Atomic Stock Deduction
    if (newStatus === 'approved' && oldStatus !== 'approved') {
      // Step 1: Pre-check stock for all items
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine);
        if (!medicine) {
          return res.status(404).json({
            success: false,
            message: `Medicine item with id ${item.medicine} was not found in inventory`
          });
        }
        if (medicine.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve order: Insufficient inventory for '${medicine.name}'. Available: ${medicine.stockQuantity}, Required: ${item.quantity}`
          });
        }
      }

      // Step 2: Atomic decrements using MongoDB atomic $inc operation
      for (const item of order.items) {
        await Medicine.findOneAndUpdate(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } }
        );
      }
    }

    // If previously approved order is cancelled, restore inventory
    if (newStatus === 'cancelled' && (oldStatus === 'approved' || oldStatus === 'dispensed')) {
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(
          item.medicine,
          { $inc: { stockQuantity: item.quantity } }
        );
      }
    }

    order.status = newStatus;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand price stockQuantity');

    res.status(200).json({
      success: true,
      message: `Order status updated from '${oldStatus}' to '${newStatus}' successfully`,
      stockDeducted: newStatus === 'approved' && oldStatus !== 'approved',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};
