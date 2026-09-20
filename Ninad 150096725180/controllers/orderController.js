const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// @desc    Place an order for medicines
// @route   POST /api/orders
// @access  Customer Only
const createOrder = async (req, res, next) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one medicine item in the order.'
      });
    }

    let calculatedTotal = 0;
    const validatedItems = [];
    let prescriptionRequired = false;

    // Validate medicines and stock availability
    for (const item of items) {
      if (!item.medicine || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicine ID and quantity >= 1.'
        });
      }

      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine with ID ${item.medicine} not found.`
        });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicine.name}'. Available: ${medicine.stockQuantity}, Requested: ${item.quantity}.`
        });
      }

      if (medicine.requiresPrescription) {
        prescriptionRequired = true;
      }

      const itemTotal = medicine.price * item.quantity;
      calculatedTotal += itemTotal;

      validatedItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });
    }

    // If any drug requires a prescription, ensure prescriptionNotes is provided
    if (prescriptionRequired && (!prescriptionNotes || prescriptionNotes.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'This order contains prescription-only medication. Please provide prescription notes / doctor details.'
      });
    }

    const order = await Order.create({
      customer: req.user._id,
      items: validatedItems,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      prescriptionNotes: prescriptionNotes ? prescriptionNotes.trim() : undefined,
      status: 'pending'
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('items.medicine', 'name brand category price requiresPrescription')
      .populate('customer', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully. Waiting for pharmacist approval.',
      data: populatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    View customer's own order history
// @route   GET /api/orders/my-orders
// @access  Customer Only
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand category dosageForm price')
      .populate('approvedBy', 'name role')
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

// @desc    List all pending and processed orders
// @route   GET /api/orders
// @access  Pharmacist / Admin
const getAllOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) {
      query.status = status.toLowerCase();
    }

    const orders = await Order.find(query)
      .populate('customer', 'name email phone address')
      .populate('items.medicine', 'name brand category price stockQuantity requiresPrescription')
      .populate('approvedBy', 'name role email')
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

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Customer (own order) / Pharmacist / Admin (all)
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('items.medicine', 'name brand category price requiresPrescription')
      .populate('approvedBy', 'name role email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID ${req.params.id}`
      });
    }

    const userRole = req.user.role.toLowerCase();
    const isCustomer = userRole === 'customer';
    const isOwnOrder = order.customer._id.toString() === req.user._id.toString();

    if (isCustomer && !isOwnOrder) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view orders placed by other customers.'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Approve/Reject/Dispense/Cancel) with atomic inventory deductions
// @route   PATCH /api/orders/:id/status
// @access  Pharmacist / Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new status: 'approved', 'dispensed', 'cancelled', or 'rejected'."
      });
    }

    const targetStatus = status.toLowerCase();
    const validStatuses = ['pending', 'approved', 'dispensed', 'cancelled', 'rejected'];

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Allowed values are: ${validStatuses.join(', ')}.`
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID ${req.params.id}`
      });
    }

    const previousStatus = order.status;

    if (previousStatus === targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Order is already in '${targetStatus}' status.`
      });
    }

    // 1. Handling transition to 'approved' -> Atomically decrement inventory
    if (targetStatus === 'approved') {
      if (previousStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve an order that is currently in '${previousStatus}' status.`
        });
      }

      // Check and atomically decrement stock for each item
      const decrementedItems = [];
      for (const item of order.items) {
        const updatedMed = await Medicine.findOneAndUpdate(
          {
            _id: item.medicine,
            stockQuantity: { $gte: item.quantity }
          },
          {
            $inc: { stockQuantity: -item.quantity }
          },
          { new: true }
        );

        if (!updatedMed) {
          // Rollback any already decremented medicines
          for (const dec of decrementedItems) {
            await Medicine.findByIdAndUpdate(dec.medicine, {
              $inc: { stockQuantity: dec.quantity }
            });
          }

          const med = await Medicine.findById(item.medicine);
          const medName = med ? med.name : item.medicine;
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for medicine '${medName}'. Cannot approve order.`
          });
        }

        decrementedItems.push(item);
      }

      order.status = 'approved';
      order.approvedBy = req.user._id;
    }
    // 2. Handling transition to 'dispensed'
    else if (targetStatus === 'dispensed') {
      if (previousStatus !== 'approved') {
        return res.status(400).json({
          success: false,
          message: `Order must be 'approved' before it can be marked as 'dispensed'. Current status: '${previousStatus}'.`
        });
      }
      order.status = 'dispensed';
      order.dispensedAt = new Date();
    }
    // 3. Handling cancellation / rejection
    else if (targetStatus === 'cancelled' || targetStatus === 'rejected') {
      // If previous status was 'approved', restore the stock
      if (previousStatus === 'approved') {
        for (const item of order.items) {
          await Medicine.findByIdAndUpdate(item.medicine, {
            $inc: { stockQuantity: item.quantity }
          });
        }
      }
      order.status = targetStatus;
    } else {
      order.status = targetStatus;
    }

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('items.medicine', 'name brand price stockQuantity')
      .populate('approvedBy', 'name role');

    res.status(200).json({
      success: true,
      message: `Order status successfully updated to '${targetStatus}'.`,
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
  getOrderById,
  updateOrderStatus
};
