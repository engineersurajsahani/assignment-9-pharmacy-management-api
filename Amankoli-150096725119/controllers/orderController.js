const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// Customer places order
exports.createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;
    const customerId = req.user._id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items array is required and cannot be empty'
      });
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const { medicineId, quantity } = item;
      const qty = parseInt(quantity, 10);

      if (!medicineId || !qty || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid medicineId and positive quantity'
        });
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found for ID: ${medicineId}`
        });
      }

      if (medicine.stockQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${medicine.name}". Requested: ${qty}, Available: ${medicine.stockQuantity}`
        });
      }

      if (medicine.requiresPrescription && !prescriptionNotes) {
        return res.status(400).json({
          success: false,
          message: `Medicine "${medicine.name}" requires a doctor prescription. Please provide prescriptionNotes.`
        });
      }

      const itemTotal = medicine.price * qty;
      calculatedTotal += itemTotal;

      validatedItems.push({
        medicine: medicine._id,
        quantity: qty,
        unitPrice: medicine.price
      });
    }

    const order = new Order({
      customer: customerId,
      items: validatedItems,
      totalAmount: calculatedTotal,
      prescriptionNotes: prescriptionNotes || '',
      status: 'pending'
    });

    await order.save();
    await order.populate('items.medicine', 'name brand price dosageForm');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully. Waiting for pharmacist approval.',
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Customer views their own orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand price dosageForm')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Pharmacist / Admin views all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('items.medicine', 'name brand price dosageForm stockQuantity')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update order status (Pharmacist / Admin) - Triggers atomic stock deduction upon approval
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'dispensed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: pending, approved, dispensed, cancelled'
      });
    }

    const order = await Order.findById(id).populate('items.medicine');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If changing from pending to approved, decrement stock atomically
    if (order.status === 'pending' && (status === 'approved' || status === 'dispensed')) {
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine._id || item.medicine);
        if (!medicine || medicine.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve order. Insufficient stock for ${medicine ? medicine.name : 'medicine'}.`
          });
        }
      }

      // Deduct stock
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine._id || item.medicine, {
          $inc: { stockQuantity: -item.quantity }
        });
      }
    }

    // If an approved order is cancelled, restore stock
    if ((order.status === 'approved' || order.status === 'dispensed') && status === 'cancelled') {
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine._id || item.medicine, {
          $inc: { stockQuantity: item.quantity }
        });
      }
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to '${status}' successfully`,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
