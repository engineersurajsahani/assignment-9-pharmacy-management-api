const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a medicine name'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Please add a brand name'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    trim: true
  },
  dosageForm: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection'],
    required: [true, 'Please specify dosage form (Tablet, Capsule, Syrup, Injection)']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative']
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Stock quantity cannot be negative']
  },
  requiresPrescription: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date,
    required: [true, 'Please add an expiry date']
  }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
