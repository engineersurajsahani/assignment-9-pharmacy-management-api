const Order = require("../models/Order");
const Medicine = require("../models/Medicine");

// Place a new order (Customer)
const createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item." });
    }

    let calculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      if (!item.medicine || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          message: "Each item must have a valid medicine ID and quantity greater than 0.",
        });
      }

      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({
          message: `Medicine not found with ID: ${item.medicine}`,
        });
      }

      if (medicine.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}`,
        });
      }

      const itemTotal = medicine.price * item.quantity;
      calculatedTotal += itemTotal;

      orderItems.push({
        medicine: medicine._id,
        quantity: item.quantity,
        unitPrice: medicine.price,
      });
    }

    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount: calculatedTotal,
      prescriptionNotes: prescriptionNotes || "",
      status: "pending",
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("items.medicine", "name brand price");

    res.status(201).json({
      message: "Order placed successfully.",
      order: populatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get logged-in customer's orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate("items.medicine", "name brand dosageForm price")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders (Pharmacist / Admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer", "name email")
      .populate("items.medicine", "name brand dosageForm price")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email")
      .populate("items.medicine", "name brand dosageForm price");

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Customer can only view their own order
    const userRole = req.user.role.toLowerCase();
    if (userRole === "customer" && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access forbidden." });
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status (Pharmacist / Admin)
// Deducts medicine stock when status is set to 'approved'
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "approved", "dispensed", "cancelled"];

    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        message: "Invalid status. Allowed values: pending, approved, dispensed, cancelled.",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const nextStatus = status.toLowerCase();
    const previousStatus = order.status;

    // Deduct stock if order is moving to 'approved'
    if (nextStatus === "approved" && previousStatus === "pending") {
      // Check stock for all items first
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine);
        if (!medicine || medicine.stockQuantity < item.quantity) {
          return res.status(400).json({
            message: `Cannot approve order. Insufficient stock for medicine ID: ${item.medicine}`,
          });
        }
      }

      // Deduct stock atomically
      for (const item of order.items) {
        await Medicine.findByIdAndUpdate(item.medicine, {
          $inc: { stockQuantity: -item.quantity },
        });
      }
    }

    order.status = nextStatus;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("items.medicine", "name brand price stockQuantity");

    res.status(200).json({
      message: `Order status updated to '${nextStatus}'.`,
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};
