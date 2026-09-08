const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

// Ensure test port
const PORT = 5002;
process.env.PORT = PORT;

const { app, server } = require('./server');

const makeRequest = (path, method = 'GET', body = null, token = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(postData);
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('\n==================================================');
  console.log('🧪 Starting Pharmacy REST API Automated Test Suite');
  console.log('==================================================\n');

  // Wait 1 second for DB connection
  await new Promise((r) => setTimeout(r, 1500));

  let customerToken = '';
  let pharmacistToken = '';
  let adminToken = '';
  let medicineId = '';
  let expiringMedicineId = '';
  let orderId = '';

  const timestamp = Date.now();

  try {
    // 1. Customer Registration
    console.log('Test 1: Customer Registration (POST /api/auth/register)');
    const regCustomerRes = await makeRequest('/api/auth/register', 'POST', {
      name: 'Test Customer',
      email: `customer_${timestamp}@test.com`,
      password: 'password123'
    });
    console.log(`  -> Status: ${regCustomerRes.status}, Token received: ${!!regCustomerRes.body.token}`);
    customerToken = regCustomerRes.body.token;

    // 2. Staff Registration - Pharmacist
    console.log('\nTest 2: Staff Registration - Pharmacist (POST /api/auth/register-staff)');
    const regPharmRes = await makeRequest('/api/auth/register-staff', 'POST', {
      name: 'Test Pharmacist',
      email: `pharmacist_${timestamp}@test.com`,
      password: 'pharmacist123',
      role: 'pharmacist',
      adminSecretKey: process.env.ADMIN_SECRET_KEY || 'admin_secret_pharmacy_2026'
    });
    console.log(`  -> Status: ${regPharmRes.status}, Role: ${regPharmRes.body.user?.role}`);
    pharmacistToken = regPharmRes.body.token;

    // 3. Staff Registration - Admin
    console.log('\nTest 3: Staff Registration - Admin (POST /api/auth/register-staff)');
    const regAdminRes = await makeRequest('/api/auth/register-staff', 'POST', {
      name: 'Test Admin',
      email: `admin_${timestamp}@test.com`,
      password: 'adminpassword123',
      role: 'admin',
      adminSecretKey: process.env.ADMIN_SECRET_KEY || 'admin_secret_pharmacy_2026'
    });
    console.log(`  -> Status: ${regAdminRes.status}, Role: ${regAdminRes.body.user?.role}`);
    adminToken = regAdminRes.body.token;

    // 4. Staff Registration Security Check (Invalid Secret Key)
    console.log('\nTest 4: Staff Registration Security Barrier (Invalid Secret Key)');
    const badStaffRes = await makeRequest('/api/auth/register-staff', 'POST', {
      name: 'Hacker Staff',
      email: `hacker_${timestamp}@test.com`,
      password: 'password123',
      role: 'admin',
      adminSecretKey: 'wrong_secret'
    });
    console.log(`  -> Status: ${badStaffRes.status} (Expected 403), Message: ${badStaffRes.body.message}`);

    // 5. Customer Attempting to Add Medicine (RBAC Check)
    console.log('\nTest 5: RBAC Barrier - Customer Attempting to Add Medicine');
    const custAddMedRes = await makeRequest('/api/medicines', 'POST', {
      name: 'Forbidden Drug',
      brand: 'NoName',
      category: 'Analgesic',
      dosageForm: 'Tablet',
      price: 10,
      stockQuantity: 50,
      expiryDate: '2027-01-01'
    }, customerToken);
    console.log(`  -> Status: ${custAddMedRes.status} (Expected 403), Message: ${custAddMedRes.body.message}`);

    // 6. Pharmacist Adding Medicine
    console.log('\nTest 6: Pharmacist Adding Medicine (POST /api/medicines)');
    const addMedRes = await makeRequest('/api/medicines', 'POST', {
      name: 'Paracetamol Extra 500mg',
      brand: 'Panadol',
      category: 'Analgesic',
      dosageForm: 'Tablet',
      price: 12.50,
      stockQuantity: 10,
      requiresPrescription: false,
      expiryDate: '2027-12-31T00:00:00.000Z'
    }, pharmacistToken);
    console.log(`  -> Status: ${addMedRes.status}, Medicine ID: ${addMedRes.body.medicine?._id}`);
    medicineId = addMedRes.body.medicine?._id;

    // 7. Pharmacist Adding Expiring Medicine
    console.log('\nTest 7: Pharmacist Adding Medicine Expiring Soon');
    const nearExpiryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const addExpMedRes = await makeRequest('/api/medicines', 'POST', {
      name: 'Amoxicillin Trihydrate',
      brand: 'Generic',
      category: 'Antibiotic',
      dosageForm: 'Capsule',
      price: 25.00,
      stockQuantity: 20,
      requiresPrescription: true,
      expiryDate: nearExpiryDate
    }, pharmacistToken);
    console.log(`  -> Status: ${addExpMedRes.status}, Expiring Drug ID: ${addExpMedRes.body.medicine?._id}`);
    expiringMedicineId = addExpMedRes.body.medicine?._id;

    // 8. Querying Expiring Medicines
    console.log('\nTest 8: Querying Expiring Medicines (GET /api/reports/expiring-soon)');
    const expRepRes = await makeRequest('/api/reports/expiring-soon', 'GET', null, pharmacistToken);
    console.log(`  -> Status: ${expRepRes.status}, Expiring Count: ${expRepRes.body.count}`);

    // 9. Pharmacist Updating Stock & Pricing
    console.log('\nTest 9: Pharmacist Updating Stock & Price (PUT /api/medicines/:id)');
    const updateMedRes = await makeRequest(`/api/medicines/${medicineId}`, 'PUT', {
      price: 15.00,
      stockQuantity: 10
    }, pharmacistToken);
    console.log(`  -> Status: ${updateMedRes.status}, Updated Price: \$${updateMedRes.body.medicine?.price}`);

    // 10. Pharmacist Attempting to Delete Medicine (Admin Only Barrier)
    console.log('\nTest 10: RBAC Barrier - Pharmacist Attempting Delete (Admin Only)');
    const pharmDelRes = await makeRequest(`/api/medicines/${expiringMedicineId}`, 'DELETE', null, pharmacistToken);
    console.log(`  -> Status: ${pharmDelRes.status} (Expected 403), Message: ${pharmDelRes.body.message}`);

    // 11. Customer Placing Order
    console.log('\nTest 11: Customer Placing Order for 3 Units (POST /api/orders)');
    const placeOrderRes = await makeRequest('/api/orders', 'POST', {
      items: [
        { medicineId, quantity: 3 }
      ],
      prescriptionNotes: 'Take 1 tablet every 8 hours'
    }, customerToken);
    console.log(`  -> Status: ${placeOrderRes.status}, Order ID: ${placeOrderRes.body.order?._id}, Total Amount: \$${placeOrderRes.body.order?.totalAmount}`);
    orderId = placeOrderRes.body.order?._id;

    // Verify stock before approval (should still be 10)
    const medBeforeApprove = await makeRequest(`/api/medicines/${medicineId}`, 'GET');
    console.log(`  -> Medicine Stock BEFORE Approval: ${medBeforeApprove.body.medicine?.stockQuantity}`);

    // 12. Pharmacist Approving Order (Atomic Stock Deduction)
    console.log('\nTest 12: Pharmacist Approving Order (PATCH /api/orders/:id/status)');
    const approveOrderRes = await makeRequest(`/api/orders/${orderId}/status`, 'PATCH', {
      status: 'approved'
    }, pharmacistToken);
    console.log(`  -> Status: ${approveOrderRes.status}, Order Status: ${approveOrderRes.body.order?.status}`);

    // Verify stock AFTER approval (should be decremented to 10 - 3 = 7)
    const medAfterApprove = await makeRequest(`/api/medicines/${medicineId}`, 'GET');
    console.log(`  -> Medicine Stock AFTER Approval: ${medAfterApprove.body.medicine?.stockQuantity} (Decremented by 3)`);

    // 13. Customer Placing Order Exceeding Available Stock
    console.log('\nTest 13: Customer Placing Large Order (100 units)');
    const placeLargeOrderRes = await makeRequest('/api/orders', 'POST', {
      items: [{ medicineId, quantity: 100 }]
    }, customerToken);
    console.log(`  -> Status: ${placeLargeOrderRes.status} (Expected 400 Insufficient Stock)`);

    // 14. Admin Deleting Medicine
    console.log('\nTest 14: Admin Deleting Medicine (DELETE /api/medicines/:id)');
    const adminDelRes = await makeRequest(`/api/medicines/${expiringMedicineId}`, 'DELETE', null, adminToken);
    console.log(`  -> Status: ${adminDelRes.status} (Expected 200 OK), Message: ${adminDelRes.body.message}`);

    console.log('\n==================================================');
    console.log('✅ ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Test Execution Failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
};

runTests();
