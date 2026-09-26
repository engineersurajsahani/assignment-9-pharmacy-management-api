require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const Order = require('./models/Order');

const seedData = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in .env. Please set MONGO_URI to run seed.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Medicine.deleteMany();
    await Order.deleteMany();
    console.log('🧹 Cleared existing database records.');

    // Seed Users
    const users = await User.create([
      {
        name: 'System Administrator',
        email: 'admin@pharmacy.com',
        password: 'adminPassword123',
        role: 'Admin'
      },
      {
        name: 'Chief Pharmacist',
        email: 'pharmacist@pharmacy.com',
        password: 'pharmaPassword123',
        role: 'Pharmacist'
      },
      {
        name: 'John Customer',
        email: 'customer@pharmacy.com',
        password: 'customerPassword123',
        role: 'Customer'
      }
    ]);
    console.log(`👤 Created ${users.length} default users (Admin, Pharmacist, Customer)`);

    const now = new Date();
    const expirySoon1 = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000); // 12 days
    const expirySoon2 = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000); // 25 days
    const normalExpiry1 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months
    const normalExpiry2 = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    // Seed Medicines
    const medicines = await Medicine.create([
      {
        name: 'Amoxicillin 500mg',
        brand: 'Amoxil',
        category: 'Antibiotic',
        dosageForm: 'Capsule',
        price: 18.5,
        stockQuantity: 45,
        requiresPrescription: true,
        expiryDate: normalExpiry1
      },
      {
        name: 'Paracetamol 650mg',
        brand: 'Dolo',
        category: 'Analgesic',
        dosageForm: 'Tablet',
        price: 4.25,
        stockQuantity: 150,
        requiresPrescription: false,
        expiryDate: normalExpiry2
      },
      {
        name: 'Cough Care Herbal',
        brand: 'Benadryl',
        category: 'Syrup',
        dosageForm: 'Syrup',
        price: 9.99,
        stockQuantity: 30,
        requiresPrescription: false,
        expiryDate: normalExpiry1
      },
      {
        name: 'Insulin Glargine Pen',
        brand: 'Lantus',
        category: 'Antidiabetic',
        dosageForm: 'Injection',
        price: 55.0,
        stockQuantity: 8, // Low stock & expiring soon
        requiresPrescription: true,
        expiryDate: expirySoon1
      },
      {
        name: 'Azithromycin 250mg',
        brand: 'Zithromax',
        category: 'Antibiotic',
        dosageForm: 'Tablet',
        price: 24.0,
        stockQuantity: 12, // Low stock & expiring soon
        requiresPrescription: true,
        expiryDate: expirySoon2
      }
    ]);
    console.log(`💊 Created ${medicines.length} sample medicines.`);

    // Seed an initial test order for the customer
    const customerUser = users[2];
    const order = await Order.create({
      customer: customerUser._id,
      items: [
        {
          medicine: medicines[1]._id, // Paracetamol
          quantity: 2,
          unitPrice: medicines[1].price
        }
      ],
      totalAmount: medicines[1].price * 2,
      prescriptionNotes: 'Not required for OTC Paracetamol',
      status: 'pending'
    });
    console.log(`📦 Created 1 sample pending order for customer.`);

    console.log('\n🎉 Database successfully seeded with sample data!');
    console.log('----------------------------------------------------');
    console.log('Default User Credentials:');
    console.log('1. Admin:      admin@pharmacy.com      / adminPassword123');
    console.log('2. Pharmacist: pharmacist@pharmacy.com / pharmaPassword123');
    console.log('3. Customer:   customer@pharmacy.com   / customerPassword123');
    console.log('----------------------------------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error(`❌ Seeding failed: ${err.message}`);
    process.exit(1);
  }
};

seedData();
