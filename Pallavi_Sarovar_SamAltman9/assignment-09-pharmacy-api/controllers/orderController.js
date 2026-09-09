const mongoose = require("mongoose");
const Order = require("../models/Order");
const Medicine = require("../models/Medicine");

exports.createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one medicine is required" });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.medicine)) {
        return res.status(400).json({ message: `Invalid medicine id: ${item.medicine}` });
      }

      const medicine = await Medicine.findById(item.medicine);

      if (!medicine) {
        return res.status(404).json({ message: `Medicine not found: ${item.medicine}` });
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ message: "Quantity must be a positive integer" });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${medicine.name}`
        });
      }

      if (medicine.requiresPrescription && !prescriptionNotes) {
        return res.status(400).json({
          message: `${medicine.name} requires prescription notes`
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
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      prescriptionNotes
    });

    const populated = await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("items.medicine");

    res.status(201).json({
      message: "Order placed successfully",
      order: populated
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate("items.medicine")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer", "name email")
      .populate("items.medicine")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { status } = req.body;

    if (!["approved", "dispensed", "cancelled"].includes(status)) {
      return res.status(400).json({
        message: "Status must be approved, dispensed, or cancelled"
      });
    }

    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "approved") {
      if (order.status !== "pending") {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Only pending orders can be approved"
        });
      }

      for (const item of order.items) {
        const updated = await Medicine.findOneAndUpdate(
          {
            _id: item.medicine,
            stockQuantity: { $gte: item.quantity }
          },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true, session }
        );

        if (!updated) {
          await session.abortTransaction();
          return res.status(400).json({
            message: "Insufficient stock. Order was not approved."
          });
        }
      }
    }

    if (status === "dispensed" && order.status !== "approved") {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Only approved orders can be dispensed"
      });
    }

    if (status === "cancelled" && ["dispensed", "cancelled"].includes(order.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "This order cannot be cancelled"
      });
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();

    const updatedOrder = await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("items.medicine");

    res.json({
      message: `Order ${status} successfully`,
      order: updatedOrder
    });
  } catch (error) {
    try { await session.abortTransaction(); } catch (_) {}
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};