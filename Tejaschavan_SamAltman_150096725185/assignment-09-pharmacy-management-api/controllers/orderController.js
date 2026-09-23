const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

/**
 * @desc    Create a new order (Customer only)
 * @route   POST /api/orders
 * @access  Private (Customer)
 */
const createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item in the items array',
      });
    }

    let calculatedTotal = 0;
    const processedItems = [];
    let requiresRx = false;

    for (const item of items) {
      const medicineId = item.medicineId || item.medicine;
      const quantity = parseInt(item.quantity, 10);

      if (!medicineId) {
        return res.status(400).json({
          success: false,
          message: 'Each item must include a valid medicineId',
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Item quantity must be a positive integer of at least 1',
        });
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found with ID: ${medicineId}`,
        });
      }

      // Check stock availability
      if (medicine.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicine.name}'. Available: ${medicine.stockQuantity}, Requested: ${quantity}`,
        });
      }

      if (medicine.requiresPrescription) {
        requiresRx = true;
      }

      const unitPrice = medicine.price;
      calculatedTotal += unitPrice * quantity;

      processedItems.push({
        medicine: medicine._id,
        quantity,
        unitPrice,
      });
    }

    // If any medicine in order requires prescription, prescriptionNotes must be provided
    if (requiresRx && (!prescriptionNotes || !prescriptionNotes.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Order contains prescription-only medication. Please provide valid prescription notes in prescriptionNotes.',
      });
    }

    const order = await Order.create({
      customer: req.user.id,
      items: processedItems,
      totalAmount: Number(calculatedTotal.toFixed(2)),
      prescriptionNotes: prescriptionNotes ? prescriptionNotes.trim() : '',
      status: 'pending',
    });

    const populatedOrder = await Order.findById(order._id).populate(
      'items.medicine',
      'name brand category dosageForm price'
    );

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully with status pending',
      data: populatedOrder,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: `Server error creating order: ${error.message}`,
    });
  }
};

/**
 * @desc    Get logged in customer's orders
 * @route   GET /api/orders/my-orders
 * @access  Private (Customer)
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand category dosageForm price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error retrieving customer orders: ${error.message}`,
    });
  }
};

/**
 * @desc    Get all orders (with status filter & pagination)
 * @route   GET /api/orders
 * @access  Private (Pharmacist, Admin)
 */
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) {
      const validStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];
      if (!validStatuses.includes(status.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      query.status = status.toLowerCase();
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name email phone')
        .populate('items.medicine', 'name brand category price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        count: orders.length,
        orders,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error retrieving orders: ${error.message}`,
    });
  }
};

/**
 * @desc    Get single order by ID
 * @route   GET /api/orders/:id
 * @access  Private (Customer who placed order, Pharmacist, Admin)
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.medicine', 'name brand category dosageForm price requiresPrescription');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID ${req.params.id}`,
      });
    }

    // If customer, verify ownership
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view another customer’s order',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID ${req.params.id}`,
      });
    }
    return res.status(500).json({
      success: false,
      message: `Server error retrieving order: ${error.message}`,
    });
  }
};

/**
 * @desc    Update order status with state machine rules & atomic stock deduction
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Pharmacist, Admin)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { status: targetStatus } = req.body;

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: "Please provide a target status ('approved', 'dispensed', or 'cancelled')",
      });
    }

    const validStatuses = ['approved', 'dispensed', 'cancelled'];
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${targetStatus}'. Allowed target statuses are: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID ${req.params.id}`,
      });
    }

    const currentStatus = order.status;

    // Validate legal state machine transitions
    if (currentStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Invalid state transition: A cancelled order cannot be modified',
      });
    }

    if (currentStatus === 'dispensed') {
      return res.status(400).json({
        success: false,
        message: 'Invalid state transition: A dispensed order is finalized and cannot be modified',
      });
    }

    if (currentStatus === targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Order is already in '${currentStatus}' status`,
      });
    }

    if (currentStatus === 'pending') {
      if (targetStatus === 'dispensed') {
        return res.status(400).json({
          success: false,
          message: "Invalid state transition: Order must be 'approved' before it can be 'dispensed'",
        });
      }
    }

    // Atomic Stock Deduction when transitioning from 'pending' to 'approved' for the first time
    if (currentStatus === 'pending' && targetStatus === 'approved') {
      const successfullyDecremented = [];

      for (const item of order.items) {
        // Atomic decrement with condition that stockQuantity >= item.quantity
        const updatedMed = await Medicine.findOneAndUpdate(
          {
            _id: item.medicine,
            stockQuantity: { $gte: item.quantity },
          },
          {
            $inc: { stockQuantity: -item.quantity },
          },
          { new: true }
        );

        if (!updatedMed) {
          // Insufficient stock or concurrent modification occurred.
          // Rollback all previously decremented medicines in this order
          for (const prevItem of successfullyDecremented) {
            await Medicine.findByIdAndUpdate(prevItem.medicine, {
              $inc: { stockQuantity: prevItem.quantity },
            });
          }

          const failedMed = await Medicine.findById(item.medicine);
          const medName = failedMed ? failedMed.name : item.medicine;
          const available = failedMed ? failedMed.stockQuantity : 0;

          return res.status(400).json({
            success: false,
            message: `Approval failed: Insufficient stock for medicine '${medName}'. Available: ${available}, Required: ${item.quantity}. Order remains pending.`,
          });
        }

        successfullyDecremented.push({
          medicine: item.medicine,
          quantity: item.quantity,
        });
      }
    }

    // If transitioning from 'approved' to 'cancelled', restore the decremented stock
    if (currentStatus === 'approved' && targetStatus === 'cancelled') {
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: item.quantity },
        });
      }
    }

    // Update order status
    order.status = targetStatus;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('items.medicine', 'name brand category price stockQuantity');

    return res.status(200).json({
      success: true,
      message: `Order status successfully transitioned from '${currentStatus}' to '${targetStatus}'`,
      data: updatedOrder,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: `Order not found with ID ${req.params.id}`,
      });
    }
    return res.status(500).json({
      success: false,
      message: `Server error updating order status: ${error.message}`,
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};
