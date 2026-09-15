const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['customer', 'pharmacist', 'admin'],
    default: 'customer'
  },
  phone: { type: String, trim: true },
  address: { type: String, trim: true }
}, { timestamps: true });

// Index for faster email lookups
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
