const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

/**
 * POST /api/orders
 * Place an order for medicines (Customer only)
 */
exports.placeOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array is required and must not be empty' });
    }

    // Validate each item and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (!item.medicine || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a medicine ID and quantity >= 1'
        });
      }

      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found: ${item.medicine}`
        });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}, Requested: ${item.quantity}`
        });
      }

      // Check if prescription is required
      if (medicine.requiresPrescription && !prescriptionNotes) {
        return res.status(400).json({
          success: false,
          message: `${medicine.name} requires a prescription. Please provide prescriptionNotes.`
        });
      }

      totalAmount += medicine.price * item.quantity;
      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });
    }

    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      prescriptionNotes,
      status: 'pending'
    });

    // Populate medicine details for response
    await order.populate('items.medicine', 'name brand');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /api/orders/my-orders
 * View customer order history (Customer only)
 */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand category')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /api/orders
 * List all pending & processed orders (Pharmacist / Admin)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * PATCH /api/orders/:id/status
 * Update order status to approved/dispensed/cancelled (Pharmacist / Admin)
 * When approved, atomically decrements stock for each item
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Status transition validation
    const allowedTransitions = {
      'pending': ['approved', 'cancelled'],
      'approved': ['dispensed', 'cancelled'],
      'dispensed': [],
      'cancelled': []
    };

    if (!allowedTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from '${order.status}' to '${status}'. Allowed: ${allowedTransitions[order.status].join(', ') || 'none'}`
      });
    }

    // When approving, deduct stock atomically
    if (status === 'approved') {
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine);
        
        if (!medicine) {
          return res.status(404).json({
            success: false,
            message: `Medicine not found: ${item.medicine}`
          });
        }

        if (medicine.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}, Required: ${item.quantity}`
          });
        }

        // Atomic stock decrement
        const updated = await Medicine.findOneAndUpdate(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true }
        );

        if (!updated) {
          return res.status(400).json({
            success: false,
            message: `Failed to decrement stock for ${medicine.name} (concurrent modification?)`
          });
        }
      }
    }

    order.status = status;
    await order.save();

    await order.populate('items.medicine', 'name brand');
    await order.populate('customer', 'name email');

    res.json({
      success: true,
      message: `Order status updated to '${status}'`,
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
