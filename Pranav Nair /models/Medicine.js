const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  dosageForm: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection'],
    required: true
  },
  price: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0 },
  requiresPrescription: { type: Boolean, default: false },
  expiryDate: { type: Date, required: true }
}, { timestamps: true });

// Indexes for common queries
medicineSchema.index({ category: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ name: 'text', brand: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
