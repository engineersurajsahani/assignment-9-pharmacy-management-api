const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true
    },
    brand: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required (e.g., Antibiotic, Analgesic, Antipyretic)'],
      trim: true
    },
    dosageForm: {
      type: String,
      enum: {
        values: ['Tablet', 'Capsule', 'Syrup', 'Injection'],
        message: '{VALUE} is not a valid dosage form. Allowed: Tablet, Capsule, Syrup, Injection'
      },
      required: [true, 'Dosage form is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative']
    },
    requiresPrescription: {
      type: Boolean,
      default: false
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for optimized searching and expiring stock queries
medicineSchema.index({ name: 'text', brand: 'text', category: 'text' });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ category: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
