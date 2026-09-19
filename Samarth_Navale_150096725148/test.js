const assert = require('assert');
const http = require('http');
const app = require('./server');

const PORT = 5577;
let server;
let customerToken = '';
let pharmacistToken = '';
let adminToken = '';
let medicineId = '';
let orderId = '';

function request(options, postData = null, token = '') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        ...options,
        headers: {
          ...(postData ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {})
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, data: parsed, raw: body });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Automated Test Suite for Assignment 9 (Pharmacy Management API)...\n');
  server = app.listen(PORT);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    // 1. Health check
    console.log('Test 1: Health Check (GET /)');
    const health = await request({ path: '/', method: 'GET' });
    assert.strictEqual(health.status, 200);
    console.log('✅ Health check passed\n');

    // 2. Register Customer
    console.log('Test 2: Register Customer (POST /api/auth/register)');
    const now = Date.now();
    const regCust = await request(
      { path: '/api/auth/register', method: 'POST' },
      { name: 'John Doe', email: `cust_${now}@shop.com`, password: 'password123' }
    );
    assert.strictEqual(regCust.status, 201);
    customerToken = regCust.data.data.token;
    console.log('✅ Customer registered successfully\n');

    // 3. Register Pharmacist
    console.log('Test 3: Register Pharmacist (POST /api/auth/register-staff)');
    const regPharm = await request(
      { path: '/api/auth/register-staff', method: 'POST' },
      {
        name: 'Dr. Sarah',
        email: `pharm_${now}@shop.com`,
        password: 'password123',
        role: 'pharmacist',
        adminSecretKey: 'admin_staff_secret_key_123'
      }
    );
    assert.strictEqual(regPharm.status, 201);
    pharmacistToken = regPharm.data.data.token;
    console.log('✅ Pharmacist registered successfully\n');

    // 4. Register Admin
    console.log('Test 4: Register Admin (POST /api/auth/register-staff)');
    const regAdmin = await request(
      { path: '/api/auth/register-staff', method: 'POST' },
      {
        name: 'Admin Boss',
        email: `admin_${now}@shop.com`,
        password: 'password123',
        role: 'admin',
        adminSecretKey: 'admin_staff_secret_key_123'
      }
    );
    assert.strictEqual(regAdmin.status, 201);
    adminToken = regAdmin.data.data.token;
    console.log('✅ Admin registered successfully\n');

    // 5. Customer attempts to add medicine (Expect 403 Forbidden)
    console.log('Test 5: Customer attempts to add medicine (Expect 403 Forbidden)');
    const custAdd = await request(
      { path: '/api/medicines', method: 'POST' },
      {
        name: 'Amoxicillin',
        brand: 'Moxatag',
        category: 'Antibiotic',
        dosageForm: 'Capsule',
        price: 150,
        stockQuantity: 50,
        expiryDate: '2026-12-31T00:00:00.000Z'
      },
      customerToken
    );
    assert.strictEqual(custAdd.status, 403);
    console.log('✅ Customer rejected with 403 Forbidden\n');

    // 6. Pharmacist adds medicine (Expect 201)
    console.log('Test 6: Pharmacist adds medicine (POST /api/medicines)');
    const pharmAdd = await request(
      { path: '/api/medicines', method: 'POST' },
      {
        name: 'Amoxicillin 500mg',
        brand: 'Moxatag',
        category: 'Antibiotic',
        dosageForm: 'Capsule',
        price: 150,
        stockQuantity: 50,
        requiresPrescription: true,
        expiryDate: '2026-12-31T00:00:00.000Z'
      },
      pharmacistToken
    );
    assert.strictEqual(pharmAdd.status, 201);
    medicineId = pharmAdd.data.data._id;
    console.log(`✅ Medicine added: ${medicineId}\n`);

    // 7. Add Expiring Medicine (in 15 days)
    console.log('Test 7: Add Expiring Medicine');
    const expDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    await request(
      { path: '/api/medicines', method: 'POST' },
      {
        name: 'Cough Syrup',
        brand: 'Benadryl',
        category: 'Syrup',
        dosageForm: 'Syrup',
        price: 80,
        stockQuantity: 20,
        expiryDate: expDate
      },
      pharmacistToken
    );

    // 8. Query expiring medicines
    console.log('Test 8: Query Expiring Medicines (GET /api/medicines/expiring)');
    const expQuery = await request(
      { path: '/api/medicines/expiring', method: 'GET' },
      null,
      pharmacistToken
    );
    assert.strictEqual(expQuery.status, 200);
    assert.ok(expQuery.data.data.length >= 1);
    console.log(`✅ Expiring medicines found: ${expQuery.data.data.length}\n`);

    // 9. Customer places order
    console.log('Test 9: Customer places order (POST /api/orders)');
    const placeOrder = await request(
      { path: '/api/orders', method: 'POST' },
      {
        items: [{ medicine: medicineId, quantity: 5 }],
        prescriptionNotes: 'Doctor prescription attached'
      },
      customerToken
    );
    assert.strictEqual(placeOrder.status, 201);
    orderId = placeOrder.data.data._id;
    assert.strictEqual(placeOrder.data.data.totalAmount, 150 * 5);
    console.log(`✅ Order placed: ${orderId}, Total: ₹${placeOrder.data.data.totalAmount}\n`);

    // 10. Pharmacist approves order -> Verify stock automatically decrements
    console.log('Test 10: Pharmacist approves order and verifies stock deduction (PATCH /api/orders/:id/status)');
    const approve = await request(
      { path: `/api/orders/${orderId}/status`, method: 'PATCH' },
      { status: 'approved' },
      pharmacistToken
    );
    assert.strictEqual(approve.status, 200);
    assert.strictEqual(approve.data.data.status, 'approved');

    // Verify medicine stock decremented from 50 to 45
    const medAfter = await request({ path: `/api/medicines/${medicineId}`, method: 'GET' });
    assert.strictEqual(medAfter.data.data.stockQuantity, 45);
    console.log(`✅ Stock correctly decremented to ${medAfter.data.data.stockQuantity}\n`);

    // 11. Customer attempts to delete medicine (Expect 403 Forbidden)
    console.log('Test 11: Customer attempts to delete medicine (Expect 403 Forbidden)');
    const custDel = await request(
      { path: `/api/medicines/${medicineId}`, method: 'DELETE' },
      null,
      customerToken
    );
    assert.strictEqual(custDel.status, 403);
    console.log('✅ Delete rejected with 403 Forbidden\n');

    // 12. Admin deletes medicine (Expect 200 OK)
    console.log('Test 12: Admin deletes medicine (DELETE /api/medicines/:id)');
    const adminDel = await request(
      { path: `/api/medicines/${medicineId}`, method: 'DELETE' },
      null,
      adminToken
    );
    assert.strictEqual(adminDel.status, 200);
    console.log('✅ Admin deleted medicine successfully\n');

    console.log('🎉 ALL 12 TESTS PASSED SUCCESSFULLY! 100% VERIFIED.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
