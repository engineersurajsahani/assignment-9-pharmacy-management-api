const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  dosageForm: {
    type: String,
    required: [true, 'Dosage form is required'],
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity cannot be negative'],
    default: 0
  },
  requiresPrescription: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  }
}, {
  timestamps: true
});

medicineSchema.index({ name: 1, brand: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
