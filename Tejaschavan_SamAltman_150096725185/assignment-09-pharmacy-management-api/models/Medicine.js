const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide the medicine name'],
      trim: true,
      maxlength: [150, 'Medicine name cannot exceed 150 characters'],
    },
    brand: {
      type: String,
      required: [true, 'Please provide the brand or manufacturer'],
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please provide the category (e.g. Antibiotic, Painkiller, Antihistamine)'],
      trim: true,
    },
    dosageForm: {
      type: String,
      required: [true, 'Please provide the dosage form'],
      enum: {
        values: ['Tablet', 'Capsule', 'Syrup', 'Injection'],
        message: '{VALUE} is not a valid dosage form. Must be Tablet, Capsule, Syrup, or Injection',
      },
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative'],
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Please provide the stock quantity'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0,
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please provide the expiry date'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for search optimization
medicineSchema.index({ name: 'text', brand: 'text', category: 'text' });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ category: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
