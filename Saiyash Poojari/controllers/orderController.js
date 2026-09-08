const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// @desc    Place a new medicine order
// @route   POST /api/orders
// @access  Private (Customer Only)
const createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one medicine item in the order'
      });
    }

    let calculatedTotal = 0;
    const processedItems = [];

    // Process and validate each ordered item
    for (const item of items) {
      const medicineId = item.medicineId || item.medicine;
      const quantity = Number(item.quantity);

      if (!medicineId) {
        return res.status(400).json({
          success: false,
          message: 'Each item must specify a valid medicine ID'
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1'
        });
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found for ID: ${medicineId}`
        });
      }

      if (medicine.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicine.name}'. Available: ${medicine.stockQuantity}, Requested: ${quantity}`
        });
      }

      const unitPrice = medicine.price;
      const subtotal = unitPrice * quantity;
      calculatedTotal += subtotal;

      processedItems.push({
        medicine: medicine._id,
        quantity,
        unitPrice
      });
    }

    const order = await Order.create({
      customer: req.user.id,
      items: processedItems,
      totalAmount: calculatedTotal,
      prescriptionNotes: prescriptionNotes || '',
      status: 'pending'
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand price category requiresPrescription');

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: populatedOrder
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get order history for authenticated customer
// @route   GET /api/orders/my-orders
// @access  Private (Customer Only)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand category dosageForm price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get all orders (Pharmacist / Admin)
// @route   GET /api/orders
// @access  Private (Pharmacist / Admin)
const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status.toLowerCase();
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand price stockQuantity category')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand price dosageForm category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Customer can only view their own order
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own orders.'
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update order status (Triggers stock deduction when approved/dispensed)
// @route   PATCH /api/orders/:id/status
// @access  Private (Pharmacist / Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];

    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const targetStatus = status.toLowerCase();
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousStatus = order.status;

    // Check if transitioning to approved or dispensed from pending
    const triggersDeduction = (targetStatus === 'approved' || targetStatus === 'dispensed') &&
                               previousStatus !== 'approved' && previousStatus !== 'dispensed';

    // Check if cancelling an order that was previously approved/dispensed (restore stock)
    const triggersRestoration = targetStatus === 'cancelled' &&
                                 (previousStatus === 'approved' || previousStatus === 'dispensed');

    if (triggersDeduction) {
      // 1. Verify stock for all items before performing any decrements
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine);
        if (!medicine) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve order. Medicine ID ${item.medicine} no longer exists.`
          });
        }

        if (medicine.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve order. Insufficient stock for '${medicine.name}'. Required: ${item.quantity}, Available: ${medicine.stockQuantity}`
          });
        }
      }

      // 2. Perform atomic stock deduction for all items
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: -item.quantity }
        });
      }
    } else if (triggersRestoration) {
      // Restore stock when an approved/dispensed order is cancelled
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: item.quantity }
        });
      }
    }

    order.status = targetStatus;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand price stockQuantity');

    return res.status(200).json({
      success: true,
      message: `Order status updated from '${previousStatus}' to '${targetStatus}'. ${triggersDeduction ? 'Stock decremented automatically.' : ''}`,
      order: updatedOrder
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus
};
