const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  prescriptionNotes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'dispensed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

// Indexes
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
