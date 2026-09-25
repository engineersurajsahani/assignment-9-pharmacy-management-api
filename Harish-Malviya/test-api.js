const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const cors = require('cors');

// Import models and routes
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const Order = require('./models/Order');

const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { getExpiringMedicines } = require('./controllers/medicineController');
const { protect } = require('./middleware/auth');
const { authorizeRoles } = require('./middleware/roleGuard');
const { errorHandler } = require('./middleware/errorHandler');

let mongoServer;
let server;
let baseUrl;

async function setup() {
  process.env.JWT_SECRET = 'test_jwt_secret_pratik_swain_150096725184';
  process.env.ADMIN_REGISTRATION_KEY = 'admin_secret_key_12345';
  process.env.PORT = '0'; // dynamic port

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());
  app.use(cors());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/medicines', medicineRoutes);
  app.use('/api/orders', orderRoutes);
  app.get('/api/reports/expiring-soon', protect, authorizeRoles('Admin', 'Pharmacist'), getExpiringMedicines);
  app.use(errorHandler);

  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

async function teardown() {
  if (server) server.close();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING VERIFICATION SUITE FOR ASSIGNMENT 09');
  console.log('Student: Pratik Swain (150096725184)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    await setup();
    console.log(`🚀 Test server listening at ${baseUrl}\n`);

    // 1. Health check
    const health = await request('/api/health');
    assert(health.status === 200, 'GET /api/health returns 200 OK');

    // 2. Register Customer
    const regCust = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Customer Test', email: 'cust@test.com', password: 'password123' }
    });
    assert(regCust.status === 201 && regCust.data.token, 'POST /api/auth/register creates customer & returns JWT');
    const customerToken = regCust.data.token;

    // 3. Register Staff with Invalid Key (expect 403)
    const badStaff = await request('/api/auth/register-staff', {
      method: 'POST',
      body: { name: 'Fake Pharma', email: 'fake@test.com', password: 'password123', role: 'Pharmacist', adminKey: 'wrong' }
    });
    assert(badStaff.status === 403, 'POST /api/auth/register-staff rejects invalid admin key with 403 Forbidden');

    // 4. Register Pharmacist with Valid Key
    const regPharma = await request('/api/auth/register-staff', {
      method: 'POST',
      body: { name: 'Pharma Test', email: 'pharma@test.com', password: 'password123', role: 'Pharmacist', adminKey: 'admin_secret_key_12345' }
    });
    assert(regPharma.status === 201 && regPharma.data.user.role === 'Pharmacist', 'POST /api/auth/register-staff registers Pharmacist');
    const pharmaToken = regPharma.data.token;

    // 5. Register Admin with Valid Key
    const regAdmin = await request('/api/auth/register-staff', {
      method: 'POST',
      body: { name: 'Admin Test', email: 'admin@test.com', password: 'password123', role: 'Admin', adminKey: 'admin_secret_key_12345' }
    });
    assert(regAdmin.status === 201 && regAdmin.data.user.role === 'Admin', 'POST /api/auth/register-staff registers Admin');
    const adminToken = regAdmin.data.token;

    // 6. Login Customer
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'cust@test.com', password: 'password123' }
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'POST /api/auth/login logs in customer successfully');

    // 7. RBAC Test: Customer attempts to add medicine (expect 403 Forbidden)
    const custAddMed = await request('/api/medicines', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        name: 'Forbidden Drug',
        brand: 'Illegal',
        category: 'Controlled',
        dosageForm: 'Tablet',
        price: 50,
        stockQuantity: 10,
        expiryDate: new Date().toISOString()
      }
    });
    assert(custAddMed.status === 403, 'RBAC: Customer receives 403 Forbidden when attempting to add medicine');

    // 8. Pharmacist adds valid medicine
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 20); // 20 days (expiring soon)

    const addMedRes = await request('/api/medicines', {
      method: 'POST',
      headers: { Authorization: `Bearer ${pharmaToken}` },
      body: {
        name: 'Amoxicillin 500mg',
        brand: 'Amoxil',
        category: 'Antibiotic',
        dosageForm: 'Capsule',
        price: 20.0,
        stockQuantity: 50,
        requiresPrescription: true,
        expiryDate: expiryDate.toISOString()
      }
    });
    assert(addMedRes.status === 201 && addMedRes.data.data._id, 'Pharmacist can add new medicine to inventory');
    const medicineId = addMedRes.data.data._id;

    // 9. Pharmacist updates medicine stock/price
    const updateMedRes = await request(`/api/medicines/${medicineId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${pharmaToken}` },
      body: { price: 22.5 }
    });
    assert(updateMedRes.status === 200 && updateMedRes.data.data.price === 22.5, 'Pharmacist updates medicine price');

    // 10. Query expiring medicines
    const expiringRes = await request('/api/medicines/expiring?days=30', {
      headers: { Authorization: `Bearer ${pharmaToken}` }
    });
    assert(expiringRes.status === 200 && expiringRes.data.expiringMedicines.length > 0, 'GET /api/medicines/expiring queries drugs expiring soon');

    // 11. Customer places order
    const placeOrderRes = await request('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        items: [{ medicine: medicineId, quantity: 5 }],
        prescriptionNotes: 'Doctor prescription Rx #4459'
      }
    });
    assert(placeOrderRes.status === 201 && placeOrderRes.data.data.status === 'pending', 'Customer places order in pending status');
    const orderId = placeOrderRes.data.data._id;

    // 12. Pharmacist approves order -> verifies ATOMIC STOCK DECREMENT (50 -> 45)
    const approveOrderRes = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${pharmaToken}` },
      body: { status: 'approved' }
    });
    assert(approveOrderRes.status === 200 && approveOrderRes.data.data.status === 'approved', 'Pharmacist updates order status to approved');

    // Check medicine stock is decremented
    const checkMedRes = await request(`/api/medicines/${medicineId}`);
    assert(
      checkMedRes.status === 200 && checkMedRes.data.data.stockQuantity === 45,
      `Atomic stock decrement verified: stock decreased from 50 to 45 (actual: ${checkMedRes.data.data.stockQuantity})`
    );

    // 13. RBAC Test: Pharmacist tries to delete medicine (expect 403 Forbidden)
    const pharmaDelete = await request(`/api/medicines/${medicineId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pharmaToken}` }
    });
    assert(pharmaDelete.status === 403, 'RBAC: Pharmacist receives 403 Forbidden when attempting to delete medicine (Admin only)');

    // 14. Admin deletes medicine (expect 200 OK)
    const adminDelete = await request(`/api/medicines/${medicineId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDelete.status === 200, 'Admin can successfully delete medicine');

  } catch (err) {
    console.error('Unexpected error during test suite:', err);
    failed++;
  } finally {
    await teardown();
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
