const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['Admin', 'Pharmacist', 'Customer'],
      default: 'Customer'
    },
    phone: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
