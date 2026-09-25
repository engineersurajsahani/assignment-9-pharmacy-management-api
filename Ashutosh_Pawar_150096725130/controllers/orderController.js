const mongoose = require("mongoose");
const Medicine = require("../models/Medicine");
const Order = require("../models/Order");

const NEXT_STATUS = {
  pending: ["approved", "cancelled"],
  approved: ["dispensed", "cancelled"],
  dispensed: [],
  cancelled: [],
};

class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const handleError = (response, error) => {
  if (error instanceof OrderError) {
    return response.status(error.status).json({ message: error.message });
  }
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((e) => e.message)
      .join(", ");
    return response.status(400).json({ message });
  }
  return response.status(500).json({ message: error.message });
};

const isStaff = (user) => user.role === "pharmacist" || user.role === "admin";

const mergeItems = (items) => {
  const quantities = new Map();
  for (const item of items) {
    const id = String(item.medicine || item.medicineId || "");
    const quantity = Number(item.quantity);
    if (!mongoose.isValidObjectId(id)) {
      throw new OrderError(400, `Invalid medicine id: ${id || "(empty)"}`);
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new OrderError(400, "quantity must be a whole number of at least 1!");
    }
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }
  return quantities;
};

const placeOrder = async (request, response) => {
  try {
    const { items, prescriptionNotes } = request.body;
    if (!Array.isArray(items) || items.length === 0) {
      return response.status(400).json({ message: "items must be a non-empty array!" });
    }

    const quantities = mergeItems(items);
    const medicines = await Medicine.find({ _id: { $in: [...quantities.keys()] } });
    const byId = new Map(medicines.map((medicine) => [String(medicine._id), medicine]));

    const orderItems = [];
    for (const [id, quantity] of quantities) {
      const medicine = byId.get(id);
      if (!medicine) {
        return response.status(404).json({ message: `Medicine not found: ${id}` });
      }
      if (medicine.isExpired) {
        return response.status(400).json({ message: `${medicine.name} is expired and cannot be ordered!` });
      }
      if (medicine.stockQuantity < quantity) {
        return response.status(409).json({
          message: `Only ${medicine.stockQuantity} unit(s) of ${medicine.name} left!`,
        });
      }
      orderItems.push({
        medicine: medicine._id,
        name: medicine.name,
        quantity,
        unitPrice: medicine.price,
        requiresPrescription: medicine.requiresPrescription,
      });
    }

    const needsPrescription = orderItems.some((item) => item.requiresPrescription);
    if (needsPrescription && !String(prescriptionNotes || "").trim()) {
      const names = orderItems.filter((item) => item.requiresPrescription).map((item) => item.name);
      return response.status(400).json({
        message: `prescriptionNotes are required for: ${names.join(", ")}`,
      });
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const order = await Order.create({
      customer: request.user._id,
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      prescriptionNotes,
      statusHistory: [{ status: "pending", by: request.user._id }],
    });

    return response.status(201).json({ message: "Order placed!", order });
  } catch (error) {
    return handleError(response, error);
  }
};

const getMyOrders = async (request, response) => {
  try {
    const orders = await Order.find({ customer: request.user._id }).sort({ createdAt: -1 });
    return response.status(200).json({ count: orders.length, orders });
  } catch (error) {
    return handleError(response, error);
  }
};

const getAllOrders = async (request, response) => {
  try {
    const filter = {};
    if (request.query.status) {
      if (!NEXT_STATUS[request.query.status]) {
        return response
          .status(400)
          .json({ message: `status must be one of: ${Object.keys(NEXT_STATUS).join(", ")}` });
      }
      filter.status = request.query.status;
    }

    const orders = await Order.find(filter)
      .populate("customer", "name email phone")
      .populate("handledBy", "name role")
      .sort({ createdAt: -1 });
    return response.status(200).json({ count: orders.length, orders });
  } catch (error) {
    return handleError(response, error);
  }
};

const getOrderById = async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(404).json({ message: "Order not found!" });
    }

    const order = await Order.findById(request.params.id)
      .populate("customer", "name email phone")
      .populate("items.medicine", "name brand stockQuantity");
    if (!order) {
      return response.status(404).json({ message: "Order not found!" });
    }
    if (!isStaff(request.user) && !order.customer._id.equals(request.user._id)) {
      return response.status(403).json({ message: "You can only view your own orders!" });
    }
    return response.status(200).json({ order });
  } catch (error) {
    return handleError(response, error);
  }
};

const changeStock = async (order, direction, session) => {
  for (const item of order.items) {
    const filter = { _id: item.medicine };
    if (direction < 0) {
      filter.stockQuantity = { $gte: item.quantity };
      filter.expiryDate = { $gt: new Date() };
    }

    const result = await Medicine.updateOne(
      filter,
      { $inc: { stockQuantity: direction * item.quantity } },
      { session },
    );

    if (result.matchedCount === 0 && direction < 0) {
      const medicine = await Medicine.findById(item.medicine).session(session);
      if (!medicine) throw new OrderError(409, `${item.name} no longer exists in inventory!`);
      if (medicine.isExpired) throw new OrderError(409, `${item.name} has expired!`);
      throw new OrderError(
        409,
        `Not enough stock for ${item.name}: need ${item.quantity}, have ${medicine.stockQuantity}!`,
      );
    }
  }
};

const moveOrder = async (orderId, nextStatus, user, options = {}) => {
  let updated;

  await mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new OrderError(404, "Order not found!");

    if (options.ownerOnly) {
      if (!order.customer.equals(user._id)) throw new OrderError(404, "Order not found!");
      if (order.status !== "pending") {
        throw new OrderError(400, `Only pending orders can be cancelled, this one is ${order.status}!`);
      }
    }

    if (!NEXT_STATUS[order.status].includes(nextStatus)) {
      throw new OrderError(400, `Cannot move an order from ${order.status} to ${nextStatus}!`);
    }

    if (nextStatus === "approved") {
      const needsPrescription = order.items.some((item) => item.requiresPrescription);
      if (needsPrescription && options.prescriptionVerified !== true) {
        throw new OrderError(
          400,
          "This order has prescription medicines. Send prescriptionVerified: true to approve it!",
        );
      }
      await changeStock(order, -1, session);
      order.prescriptionVerified = needsPrescription;
    }

    if (nextStatus === "cancelled" && order.status === "approved") {
      await changeStock(order, 1, session);
    }

    order.status = nextStatus;
    order.handledBy = user._id;
    order.statusHistory.push({ status: nextStatus, by: user._id });
    await order.save({ session });
    updated = order;
  });

  return updated;
};

const updateOrderStatus = async (request, response) => {
  try {
    const { status, prescriptionVerified } = request.body;

    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(404).json({ message: "Order not found!" });
    }
    if (!["approved", "dispensed", "cancelled"].includes(status)) {
      return response
        .status(400)
        .json({ message: "status must be one of: approved, dispensed, cancelled" });
    }

    const order = await moveOrder(request.params.id, status, request.user, { prescriptionVerified });
    return response.status(200).json({ message: `Order ${status}!`, order });
  } catch (error) {
    return handleError(response, error);
  }
};

const cancelMyOrder = async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(404).json({ message: "Order not found!" });
    }

    const order = await moveOrder(request.params.id, "cancelled", request.user, { ownerOnly: true });
    return response.status(200).json({ message: "Order cancelled!", order });
  } catch (error) {
    return handleError(response, error);
  }
};

const getOrderSummary = async (request, response) => {
  try {
    const byStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $project: { _id: 0, status: "$_id", count: 1, totalAmount: { $round: ["$totalAmount", 2] } } },
      { $sort: { status: 1 } },
    ]);

    const topMedicines = await Order.aggregate([
      { $match: { status: { $in: ["approved", "dispensed"] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.medicine",
          name: { $first: "$items.name" },
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, medicine: "$_id", name: 1, unitsSold: 1, revenue: { $round: ["$revenue", 2] } } },
    ]);

    return response.status(200).json({ byStatus, topMedicines });
  } catch (error) {
    return handleError(response, error);
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelMyOrder,
  getOrderSummary,
};
