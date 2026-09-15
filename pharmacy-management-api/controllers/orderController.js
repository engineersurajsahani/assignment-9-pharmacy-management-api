const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

/**
 * POST /api/orders — Customer only
 * Places an order for one or more medicines. Validates each medicine exists
 * and has enough stock at the moment of ordering (stock isn't deducted yet —
 * that happens atomically when a pharmacist/admin approves the order).
 */
async function placeOrder(req, res) {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items must be a non-empty array' });
    }

    let totalAmount = 0;
    const orderItems = [];
    let requiresPrescriptionNote = false;

    for (const entry of items) {
      const { medicineId, quantity } = entry;
      if (!medicineId || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item requires a medicineId and a positive integer quantity'
        });
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({ success: false, message: `Medicine ${medicineId} not found` });
      }
      if (medicine.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}. Only ${medicine.stockQuantity} unit(s) available.`
        });
      }
      if (medicine.requiresPrescription) {
        requiresPrescriptionNote = true;
      }

      orderItems.push({ medicine: medicine._id, quantity, unitPrice: medicine.price });
      totalAmount += medicine.price * quantity;
    }

    if (requiresPrescriptionNote && (!prescriptionNotes || !prescriptionNotes.trim())) {
      return res.status(400).json({
        success: false,
        message: 'This order includes a prescription-only medicine; prescriptionNotes is required'
      });
    }

    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      prescriptionNotes,
      status: 'pending'
    });

    return res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/orders/my-orders — Customer only
 */
async function myOrders(req, res) {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.medicine', 'name brand price')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/orders — Pharmacist/Admin. All orders, optional ?status= filter.
 */
async function listOrders(req, res) {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand price')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

const VALID_STATUSES = ['pending', 'approved', 'dispensed', 'cancelled'];

/**
 * PATCH /api/orders/:id/status — Pharmacist/Admin
 * Updates order status. When transitioning into "approved" for the first
 * time, atomically decrements stockQuantity for every item in the order —
 * each decrement is itself a conditional update (stock >= quantity) so
 * concurrent approvals can never push stock negative. If any item can't be
 * decremented (insufficient stock at approval time), all prior decrements
 * in this request are rolled back and the order is not approved.
 */
async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isFirstApproval = status === 'approved' && order.status !== 'approved';

    if (isFirstApproval) {
      const decremented = []; // track for rollback on partial failure

      for (const item of order.items) {
        const updatedMedicine = await Medicine.findOneAndUpdate(
          { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true }
        );

        if (!updatedMedicine) {
          for (const rollback of decremented) {
            await Medicine.findByIdAndUpdate(rollback.medicine, {
              $inc: { stockQuantity: rollback.quantity }
            });
          }
          return res.status(400).json({
            success: false,
            message: 'Insufficient stock to approve this order; one or more items are no longer available in the required quantity'
          });
        }

        decremented.push({ medicine: item.medicine, quantity: item.quantity });
      }
    }

    order.status = status;
    await order.save();

    return res.status(200).json({ success: true, message: 'Order status updated', data: order });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { placeOrder, myOrders, listOrders, updateOrderStatus };
