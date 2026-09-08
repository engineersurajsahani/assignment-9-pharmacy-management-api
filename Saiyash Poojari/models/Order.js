const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] }
  }],
  totalAmount: { type: Number, required: true, min: [0, 'Total amount cannot be negative'] },
  prescriptionNotes: { type: String, default: '' },
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'dispensed', 'cancelled'],
      message: '{VALUE} is not a valid order status'
    },
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
