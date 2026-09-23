// Sample seed data used to test the API immediately.
// Loaded by `node data/seed.js`.

const medicines = [
  {
    name: "Paracetamol",
    brand: "ABC Pharma",
    category: "Analgesic",
    dosageForm: "Tablet",
    price: 50,
    stockQuantity: 100,
    requiresPrescription: false,
    // Far expiry -> should NOT appear in expiring-soon report
    expiryDate: new Date("2027-12-31"),
  },
  {
    name: "Ibuprofen",
    brand: "XYZ Pharma",
    category: "Analgesic",
    dosageForm: "Tablet",
    price: 40,
    stockQuantity: 8,
    requiresPrescription: false,
    // Low stock (8 < 10) -> should appear in low-stock report
    expiryDate: new Date("2027-06-30"),
  },
  {
    name: "Amoxicillin",
    brand: "MediCorp",
    category: "Antibiotic",
    dosageForm: "Capsule",
    price: 120,
    stockQuantity: 60,
    requiresPrescription: true,
    // Expires within 30 days of "today" -> should appear in expiring reports
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  },
  {
    name: "Aspirin",
    brand: "HealthCo",
    category: "Analgesic",
    dosageForm: "Tablet",
    price: 35,
    stockQuantity: 150,
    requiresPrescription: false,
    expiryDate: new Date("2027-01-15"),
  },
  {
    name: "Cough Syrup DX",
    brand: "CareLab",
    category: "Antitussive",
    dosageForm: "Syrup",
    price: 75,
    stockQuantity: 5,
    requiresPrescription: false,
    // Low stock (5 < 10) -> should appear in low-stock report
    expiryDate: new Date("2027-09-30"),
  },
  {
    name: "Vitamin C Tablets",
    brand: "NutriPlus",
    category: "Supplement",
    dosageForm: "Tablet",
    price: 60,
    stockQuantity: 200,
    requiresPrescription: false,
    expiryDate: new Date("2027-11-20"),
  },
];

const users = [
  // Password for all demo users: password123 (hashed with bcrypt on seed)
  {
    name: "John Customer",
    email: "customer@demo.com",
    password: "password123",
    role: "customer",
  },
  {
    name: "Priya Pharmacist",
    email: "pharmacist@demo.com",
    password: "password123",
    role: "pharmacist",
  },
  {
    name: "Amit Admin",
    email: "admin@demo.com",
    password: "password123",
    role: "admin",
  },
];

module.exports = { medicines, users };