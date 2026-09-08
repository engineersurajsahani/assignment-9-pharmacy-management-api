const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

/**
 * @desc    Place a new medicine order
 * @route   POST /api/orders
 * @access  Customer Only
 */
const placeOrder = async (req, res, next) => {
  try {
    const { items, prescriptionNotes } = req.body;
    const customerId = req.user.id;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one medicine item in the order.'
      });
    }

    let calculatedTotal = 0;
    const validatedItems = [];
    let prescriptionRequired = false;

    // Validate each ordered medicine against live database records
    for (const item of items) {
      if (!item.medicine || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must include a valid medicine ID and a quantity of at least 1.'
        });
      }

      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine with ID ${item.medicine} not found in catalog.`
        });
      }

      // Check current available stock
      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicine.name}'. Available: ${medicine.stockQuantity}, Requested: ${item.quantity}.`
        });
      }

      // Track if any medicine in the cart requires a prescription
      if (medicine.requiresPrescription) {
        prescriptionRequired = true;
      }

      // Server-side price calculation (never trust client-supplied unitPrice)
      const unitPrice = medicine.price;
      calculatedTotal += unitPrice * item.quantity;

      validatedItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: unitPrice
      });
    }

    // Prescription verification requirement
    if (prescriptionRequired && (!prescriptionNotes || prescriptionNotes.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'One or more medicines in your order require a valid prescription. Please provide prescription notes.'
      });
    }

    // Create order with status 'pending'
    const order = await Order.create({
      customer: customerId,
      items: validatedItems,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      prescriptionNotes: prescriptionNotes ? prescriptionNotes.trim() : '',
      status: 'pending'
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand dosageForm price requiresPrescription');

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully. Current status is pending pharmacist approval.',
      data: populatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View customer's own order history
 * @route   GET /api/orders/my-orders
 * @access  Customer Only
 */
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand dosageForm price requiresPrescription')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List all orders (pending & processed) with optional filters
 * @route   GET /api/orders
 * @access  Pharmacist / Admin
 */
const getAllOrders = async (req, res, next) => {
  try {
    const { status, customer, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (customer) {
      query.customer = customer;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name email')
        .populate('items.medicine', 'name brand dosageForm price requiresPrescription')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order details by ID
 * @route   GET /api/orders/:id
 * @access  Customer (Owner) / Pharmacist / Admin
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand category dosageForm price requiresPrescription');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID: ${req.params.id}`
      });
    }

    // Role barrier: Customer can only view their own order
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this order.'
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status (Approve, Dispense, Cancel) with atomic inventory deductions
 * @route   PATCH /api/orders/:id/status
 * @access  Pharmacist / Admin
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const allowedStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: [${allowedStatuses.join(', ')}].`
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID: ${orderId}`
      });
    }

    const previousStatus = order.status;

    // If status is identical, return early
    if (previousStatus === status) {
      return res.status(200).json({
        success: true,
        message: `Order is already in '${status}' status.`,
        data: order
      });
    }

    // Disallow modifying cancelled orders
    if (previousStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status of a cancelled order.'
      });
    }

    // --- ATOMIC STOCK DEDUCTION LOGIC ---
    // Trigger deduction when transitioning from 'pending' to 'approved' (or directly to 'dispensed')
    if (previousStatus === 'pending' && (status === 'approved' || status === 'dispensed')) {
      const decrementedItems = [];

      // Sequentially perform atomic decrements with stock check condition: stockQuantity >= quantity
      for (const item of order.items) {
        const updatedMed = await Medicine.findOneAndUpdate(
          {
            _id: item.medicine,
            stockQuantity: { $gte: item.quantity } // Condition guarantees stock sufficiency atomically
          },
          {
            $inc: { stockQuantity: -item.quantity } // Atomic decrement
          },
          { new: true }
        );

        if (!updatedMed) {
          // Insufficient stock found for this item: Rollback previously decremented items
          for (const rollbackItem of decrementedItems) {
            await Medicine.findByIdAndUpdate(rollbackItem.medicine, {
              $inc: { stockQuantity: rollbackItem.quantity }
            });
          }

          const medDoc = await Medicine.findById(item.medicine);
          const medName = medDoc ? medDoc.name : item.medicine;
          const currentStock = medDoc ? medDoc.stockQuantity : 0;

          return res.status(400).json({
            success: false,
            message: `Cannot approve order: Insufficient stock for medicine '${medName}'. Available: ${currentStock}, Required: ${item.quantity}. Transaction rolled back.`
          });
        }

        decrementedItems.push(item);
      }
    }

    // If an approved/dispensed order is later cancelled, restore inventory
    if ((previousStatus === 'approved' || previousStatus === 'dispensed') && status === 'cancelled') {
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: item.quantity }
        });
      }
    }

    // Update order status
    order.status = status;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email role')
      .populate('items.medicine', 'name brand dosageForm price stockQuantity requiresPrescription');

    return res.status(200).json({
      success: true,
      message: `Order status successfully updated from '${previousStatus}' to '${status}'. Inventory updated accordingly.`,
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus
};
