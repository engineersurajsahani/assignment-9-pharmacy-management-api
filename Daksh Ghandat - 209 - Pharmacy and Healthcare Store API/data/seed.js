// Seeds the database with sample medicines and demo users (all three roles).
// Usage:  node data/seed.js
//
// All demo users share the password "password123" (hashed via the User model).

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Medicine = require("../models/Medicine");
const User = require("../models/User");
const { medicines, users } = require("./seedData");

const seed = async () => {
  await connectDB();

  try {
    // Fresh start: clear existing demo data
    await Promise.all([Medicine.deleteMany({}), User.deleteMany({})]);
    console.log("Cleared existing medicines and users.");

    const createdMedicines = await Medicine.insertMany(medicines);
    console.log(`Seeded ${createdMedicines.length} medicines.`);

    // Passwords are hashed by the User model's pre-save hook
    const createdUsers = await User.create(users);
    console.log(`Seeded ${createdUsers.length} users.`);

    console.log("\n--- Demo login credentials (password: password123) ---");
    createdUsers.forEach((u) => console.log(`  ${u.role.padEnd(11)} ${u.email}`));
    console.log("\nSeed completed. You can now start the API with: npm run dev");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seed();