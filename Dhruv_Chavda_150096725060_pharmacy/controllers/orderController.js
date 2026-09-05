const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private (Customer Only)
exports.createOrder = async (req, res, next) => {
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
    let prescriptionRequired = false;
    const prescriptionMedicines = [];

    // Verify all medicines, check stock, and calculate accurate pricing
    for (const item of items) {
      if (!item.medicine || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicine ID and quantity >= 1'
        });
      }

      const medicineDoc = await Medicine.findById(item.medicine);
      if (!medicineDoc) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found with ID: ${item.medicine}`
        });
      }

      // Check stock availability
      if (medicineDoc.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicineDoc.name}'. Requested: ${item.quantity}, Available: ${medicineDoc.stockQuantity}`
        });
      }

      // Check if any drug requires prescription
      if (medicineDoc.requiresPrescription) {
        prescriptionRequired = true;
        prescriptionMedicines.push(medicineDoc.name);
      }

      const itemTotal = medicineDoc.price * item.quantity;
      calculatedTotal += itemTotal;

      processedItems.push({
        medicine: medicineDoc._id,
        quantity: item.quantity,
        unitPrice: medicineDoc.price
      });
    }

    // Prescription validation
    if (prescriptionRequired && (!prescriptionNotes || !prescriptionNotes.trim())) {
      return res.status(400).json({
        success: false,
        message: `Prescription notes are required for ordered prescription medicines: [${prescriptionMedicines.join(', ')}]`
      });
    }

    // Create pending order
    const order = await Order.create({
      customer: req.user._id,
      items: processedItems,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      prescriptionNotes: prescriptionNotes ? prescriptionNotes.trim() : undefined,
      status: 'pending'
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('items.medicine', 'name brand category price requiresPrescription')
      .populate('customer', 'name email');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully and is pending approval',
      data: populatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's own order history
// @route   GET /api/orders/my-orders
// @access  Private (Customer Only)
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand category dosageForm price')
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

// @desc    Get all orders (with optional status filter)
// @route   GET /api/orders
// @access  Private (Pharmacist, Admin)
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status.toLowerCase();
    }

    const orders = await Order.find(filter)
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

// @desc    Get single order details by ID
// @route   GET /api/orders/:id
// @access  Private (Owner Customer, Pharmacist, Admin)
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand category dosageForm price stockQuantity');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Customer can only view their own orders; Pharmacist and Admin can view any
    const isOwner = order.customer._id.toString() === req.user._id.toString();
    const isStaff = ['Pharmacist', 'Admin'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this order'
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

// @desc    Update order status (Approve, Dispense, Cancel) with Atomic Stock Deduction
// @route   PATCH /api/orders/:id/status
// @access  Private (Pharmacist, Admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];

    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed statuses: ${allowedStatuses.join(', ')}`
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

    if (previousStatus === targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Order is already in '${targetStatus}' status`
      });
    }

    // Stock Deduction Logic:
    // If transitioning from 'pending' to 'approved', atomically decrement medicine stock
    if (previousStatus === 'pending' && targetStatus === 'approved') {
      const decrementedItems = [];

      for (const item of order.items) {
        // Atomic update with condition ensuring stockQuantity >= requested quantity
        const updatedMedicine = await Medicine.findOneAndUpdate(
          {
            _id: item.medicine,
            stockQuantity: { $gte: item.quantity }
          },
          {
            $inc: { stockQuantity: -item.quantity }
          },
          { returnDocument: 'after' }
        );

        if (!updatedMedicine) {
          // Stock was insufficient during atomic decrement; rollback previously decremented items
          for (const rolledBackItem of decrementedItems) {
            await Medicine.findByIdAndUpdate(rolledBackItem.medicine, {
              $inc: { stockQuantity: rolledBackItem.quantity }
            });
          }

          const medicineInfo = await Medicine.findById(item.medicine);
          const medicineName = medicineInfo ? medicineInfo.name : item.medicine;

          return res.status(400).json({
            success: false,
            message: `Cannot approve order: Insufficient stock for medicine '${medicineName}'. Atomic deduction prevented.`
          });
        }

        decrementedItems.push(item);
      }
    }

    // If order is cancelled after being approved/dispensed, restore stock atomically
    if (['approved', 'dispensed'].includes(previousStatus) && targetStatus === 'cancelled') {
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: item.quantity }
        });
      }
    }

    // Update order status
    order.status = targetStatus;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand category price stockQuantity');

    res.status(200).json({
      success: true,
      message: `Order status successfully updated to '${targetStatus}'`,
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};
