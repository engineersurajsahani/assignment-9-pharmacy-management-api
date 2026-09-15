const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// POST /api/orders (Customer)
const placeOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);

      if (!medicine) {
        return res.status(404).json({ message: `Medicine not found: ${item.medicine}` });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${medicine.name}` });
      }

      if (medicine.requiresPrescription && !prescriptionNotes) {
        return res.status(400).json({
          message: `${medicine.name} requires a prescription. Please include prescriptionNotes.`
        });
      }

      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price
      });

      totalAmount += medicine.price * item.quantity;
    }

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      prescriptionNotes
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/my-orders (Customer)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.medicine', 'name brand')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders (Pharmacist/Admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('items.medicine', 'name brand')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/orders/:id/status (Pharmacist/Admin — approve triggers stock deduction)
const updateOrderStatus = async (req, res) => {
  const session = await Order.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'dispensed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only deduct stock when transitioning INTO approved from pending
    if (status === 'approved' && order.status === 'pending') {
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine).session(session);

        if (!medicine || medicine.stockQuantity < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `Insufficient stock to approve order — ${medicine ? medicine.name : 'medicine missing'}`
          });
        }

        medicine.stockQuantity -= item.quantity;
        await medicine.save({ session });
      }
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();
    res.json(order);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = { placeOrder, getMyOrders, getAllOrders, updateOrderStatus };