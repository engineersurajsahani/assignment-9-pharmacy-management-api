const mongoose = require("mongoose");

const ROLES = ["customer", "pharmacist", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: "customer" },
  },
  { timestamps: true },
);

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
module.exports.ROLES = ROLES;
