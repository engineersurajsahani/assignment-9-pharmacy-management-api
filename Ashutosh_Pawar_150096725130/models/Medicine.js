const mongoose = require("mongoose");

const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection"];

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    dosageForm: { type: String, enum: DOSAGE_FORMS, required: true },
    price: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0 },
    requiresPrescription: { type: Boolean, default: false },
    expiryDate: { type: Date, required: true },
  },
  { timestamps: true },
);

medicineSchema.index({ name: 1, brand: 1, dosageForm: 1 }, { unique: true });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ category: 1 });

medicineSchema.virtual("isExpired").get(function () {
  return this.expiryDate ? this.expiryDate.getTime() < Date.now() : false;
});

medicineSchema.pre("validate", function () {
  if (this.stockQuantity !== undefined && !Number.isInteger(this.stockQuantity)) {
    this.invalidate("stockQuantity", "stockQuantity must be a whole number");
  }
});

medicineSchema.set("toJSON", { virtuals: true, versionKey: false });

const Medicine = mongoose.model("Medicine", medicineSchema);
module.exports = Medicine;
module.exports.DOSAGE_FORMS = DOSAGE_FORMS;
