const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide medicine name'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Please provide brand name'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please provide category (e.g. Antibiotic, Analgesic)'],
    trim: true
  },
  dosageForm: {
    type: String,
    enum: {
      values: ['Tablet', 'Capsule', 'Syrup', 'Injection'],
      message: '{VALUE} is not a valid dosage form. Must be Tablet, Capsule, Syrup, or Injection'
    },
    required: [true, 'Please provide dosage form']
  },
  price: {
    type: Number,
    required: [true, 'Please provide medicine price'],
    min: [0, 'Price cannot be negative']
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock quantity cannot be negative']
  },
  requiresPrescription: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date,
    required: [true, 'Please provide expiry date']
  }
}, { timestamps: true });

// Compound text index for search on name, brand, category
medicineSchema.index({ name: 'text', brand: 'text', category: 'text' });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ category: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
