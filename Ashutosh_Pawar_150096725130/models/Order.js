const mongoose = require("mongoose");

const STATUSES = ["pending", "approved", "dispensed", "cancelled"];

const orderItemSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    requiresPrescription: { type: Boolean, default: false },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, "an order needs at least one item"],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    prescriptionNotes: { type: String, trim: true },
    prescriptionVerified: { type: Boolean, default: false },
    status: { type: String, enum: STATUSES, default: "pending" },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    statusHistory: [
      {
        status: { type: String, enum: STATUSES },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

orderSchema.set("toJSON", { versionKey: false });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
module.exports.STATUSES = STATUSES;
