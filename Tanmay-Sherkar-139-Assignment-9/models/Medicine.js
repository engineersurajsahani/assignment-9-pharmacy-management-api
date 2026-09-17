const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true },
    category: { type: String, required: true }, // e.g., "Antibiotic", "Analgesic"
    dosageForm: {
      type: String,
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injection'],
      required: true
    },
    price: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0 },
    requiresPrescription: { type: Boolean, default: false },
    expiryDate: { type: Date, required: true }
  },
  { timestamps: true }
);

medicineSchema.index({ name: 'text', brand: 'text', category: 'text' });

medicineSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.inStock = obj.stockQuantity > 0;
  return obj;
};

module.exports = mongoose.model('Medicine', medicineSchema);