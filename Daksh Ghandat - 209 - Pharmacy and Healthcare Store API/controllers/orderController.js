const Order = require("../models/Order");
const Medicine = require("../models/Medicine");
const mongoose = require("mongoose");

// Helper: validate a MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Allowed workflow transitions
const allowedTransitions = {
  pending: ["approved", "cancelled"],
  approved: ["dispensed"],
  dispensed: [],
  cancelled: [],
};

// @desc   Place an order (CUSTOMER only)
// @route  POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { items, prescriptionNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item.",
      });
    }

    // Collect all medicine ids from the request
    const medicineIds = items.map((item) => item.medicine);

    // Make sure every id is a valid ObjectId before querying
    for (const id of medicineIds) {
      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid medicine ID: ${id}`,
        });
      }
    }

    // Fetch the medicines in a single query (faster than per-item queries)
    const medicines = await Medicine.find({ _id: { $in: medicineIds } });

    if (medicines.length !== new Set(medicineIds.map(String)).size) {
      return res.status(400).json({
        success: false,
        message: "One or more medicines do not exist.",
      });
    }

    const medicineMap = {};
    medicines.forEach((medicine) => {
      medicineMap[String(medicine._id)] = medicine;
    });

    // Check for prescription medicines and require prescriptionNotes
    let requiresPrescription = false;
    for (const item of items) {
      const medicine = medicineMap[item.medicine];
      if (medicine.requiresPrescription) {
        requiresPrescription = true;
        break;
      }
    }

    if (requiresPrescription && !prescriptionNotes) {
      return res.status(400).json({
        success: false,
        message: "Prescription notes are required for one or more medicines.",
      });
    }

    // Build order items with server-side unitPrice and total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);

      // Validate quantity
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a quantity of at least 1.",
        });
      }

      const medicine = medicineMap[item.medicine];

      // Check stock availability (no deduction at this stage)
      if (medicine.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}`,
        });
      }

      orderItems.push({
        medicine: medicine._id,
        quantity,
        unitPrice: medicine.price, // server-side price, never trust the client
      });

      totalAmount += quantity * medicine.price;
    }

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      prescriptionNotes: prescriptionNotes || "",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Get the logged-in customer's own orders
// @route  GET /api/orders/my-orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate("customer", "name email")
      .populate("items.medicine", "name brand price");

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully.",
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Get all orders (pharmacist/admin) with optional status filter
// @route  GET /api/orders
const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) {
      const validStatuses = ["pending", "approved", "dispensed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value.",
        });
      }
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("customer", "name email")
      .populate("items.medicine", "name brand price");

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully.",
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc   Update an order status (approve / dispense / cancel)
// @route  PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  // Use a Mongo session so stock deduction + order update are atomic
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: "Please provide the new status.",
      });
    }

    const validStatuses = ["pending", "approved", "dispensed", "cancelled"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value.",
      });
    }

    session.startTransaction();

    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const currentStatus = order.status;

    // Reject approving twice
    if (currentStatus === newStatus) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Order is already ${currentStatus}.`,
      });
    }

    // Validate the transition is allowed
    const allowedNext = allowedTransitions[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot change order from '${currentStatus}' to '${newStatus}'.`,
      });
    }

    // If approving, deduct stock atomically for every item
    if (newStatus === "approved") {
      for (const item of order.items) {
        const medicine = await Medicine.findById(item.medicine).session(session);

        if (!medicine) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: `Medicine for order item not found.`,
          });
        }

        // Prevent negative stock
        if (medicine.stockQuantity < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}. Order stays pending.`,
          });
        }

        // Atomic update via $inc avoids read-then-write race conditions
        const updated = await Medicine.updateOne(
          { _id: medicine._id, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } }
        ).session(session);

        // If the conditional update matched 0 documents, stock changed concurrently
        if (updated.modifiedCount === 0) {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            message: `Stock changed for ${medicine.name}. Order approval cancelled, order stays pending.`,
          });
        }
      }
    }

    // Persist the order within the same transaction
    order.status = newStatus;
    await order.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: `Order ${newStatus === "dispensed" ? "dispensed" : "updated to " + newStatus} successfully.`,
      data: order,
    });
  } catch (error) {
    // Roll back everything on any failure
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
};