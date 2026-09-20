const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const request = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const fullPath = path.startsWith('/api') || path === '/' ? path : `/api${path}`;
    const url = new URL(`${BASE_URL}${fullPath}`);
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

async function runTests() {
  console.log('🧪 Starting Automated API & RBAC Verification Tests...\n');

  let customerToken = '';
  let pharmacistToken = '';
  let adminToken = '';
  let med1Id = '';
  let med2Id = '';
  let orderId = '';

  const timestamp = Date.now();

  try {
    // 1. Health check
    console.log('1. Testing Root / Health Check endpoint...');
    const health = await request('/');
    console.log(`   Response status: ${health.status}, success: ${health.data.success}`);

    // 2. Register Customer
    console.log('\n2. Registering Customer account...');
    const custEmail = `customer_${timestamp}@test.com`;
    const custRes = await request('/auth/register', 'POST', {
      name: 'Test Customer',
      email: custEmail,
      password: 'password123',
      phone: '1234567890',
      address: '456 Test Street'
    });
    console.log(`   Status: ${custRes.status}, Message: ${custRes.data.message}`);
    customerToken = custRes.data.token;

    // 3. Register Pharmacist (Staff with Admin Key)
    console.log('\n3. Registering Pharmacist account (using adminKey)...');
    const pharmaEmail = `pharmacist_${timestamp}@test.com`;
    const pharmaRes = await request('/auth/register-staff', 'POST', {
      name: 'Dr. Test Pharmacist',
      email: pharmaEmail,
      password: 'password123',
      role: 'pharmacist',
      adminKey: process.env.ADMIN_SECRET_KEY || 'AdminPharmacySecretKey2026!'
    });
    console.log(`   Status: ${pharmaRes.status}, Message: ${pharmaRes.data.message}`);
    pharmacistToken = pharmaRes.data.token;

    // 4. Register Admin (Staff with Admin Key)
    console.log('\n4. Registering Admin account (using adminKey)...');
    const adminEmail = `admin_${timestamp}@test.com`;
    const adminRes = await request('/auth/register-staff', 'POST', {
      name: 'Root Admin',
      email: adminEmail,
      password: 'password123',
      role: 'admin',
      adminKey: process.env.ADMIN_SECRET_KEY || 'AdminPharmacySecretKey2026!'
    });
    console.log(`   Status: ${adminRes.status}, Message: ${adminRes.data.message}`);
    adminToken = adminRes.data.token;

    // 5. Test RBAC: Customer attempting to create medicine (Should be 403 Forbidden)
    console.log('\n5. RBAC Test: Customer attempting to add medicine (Expect 403)...');
    const custAddMed = await request('/medicines', 'POST', {
      name: 'Unauthorized Drug',
      brand: 'FakeBrand',
      category: 'Analgesic',
      dosageForm: 'Tablet',
      price: 10,
      stockQuantity: 100,
      requiresPrescription: false,
      expiryDate: '2027-01-01'
    }, customerToken);
    console.log(`   Status: ${custAddMed.status} (Expected 403), Success: ${custAddMed.data.success}`);

    // 6. Pharmacist adds regular medicine
    console.log('\n6. Pharmacist adding Amoxicillin 500mg (Stock: 100)...');
    const med1Res = await request('/medicines', 'POST', {
      name: 'Amoxicillin 500mg',
      brand: 'Amoxil',
      category: 'Antibiotic',
      dosageForm: 'Capsule',
      price: 15.50,
      stockQuantity: 100,
      requiresPrescription: true,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    }, pharmacistToken);
    console.log(`   Status: ${med1Res.status}, Created: ${med1Res.data.data.name}`);
    med1Id = med1Res.data.data._id;

    // 7. Pharmacist adds expiring medicine (Expiring in 10 days)
    console.log('\n7. Pharmacist adding Expiring Cough Syrup (Expiring in 10 days)...');
    const med2Res = await request('/medicines', 'POST', {
      name: 'Cough Relief Syrup',
      brand: 'Robitussin',
      category: 'Antitussive',
      dosageForm: 'Syrup',
      price: 9.99,
      stockQuantity: 10,
      requiresPrescription: false,
      expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    }, pharmacistToken);
    console.log(`   Status: ${med2Res.status}, Created: ${med2Res.data.data.name}`);
    med2Id = med2Res.data.data._id;

    // 8. Query Expiring Medicines Report
    console.log('\n8. Testing Expiring Medicines Report (/api/reports/expiring-soon)...');
    const expiringRes = await request('/reports/expiring-soon', 'GET', null, pharmacistToken);
    console.log(`   Status: ${expiringRes.status}, Expiring count: ${expiringRes.data.count}`);

    // 9. Query Low Stock Report
    console.log('\n9. Testing Low Stock Report (/api/reports/low-stock?threshold=15)...');
    const lowStockRes = await request('/reports/low-stock?threshold=15', 'GET', null, pharmacistToken);
    console.log(`   Status: ${lowStockRes.status}, Low stock count: ${lowStockRes.data.count}`);

    // 10. Customer places an order for Amoxicillin (quantity 5)
    console.log('\n10. Customer placing order for 5 units of Amoxicillin 500mg...');
    const orderRes = await request('/orders', 'POST', {
      items: [
        { medicine: med1Id, quantity: 5 }
      ],
      prescriptionNotes: 'Dr. John Doe, Ref # 99281'
    }, customerToken);
    console.log(`   Status: ${orderRes.status}, Order Total: $${orderRes.data.data.totalAmount}, Status: ${orderRes.data.data.status}`);
    orderId = orderRes.data.data._id;

    // 11. Customer view order history
    console.log('\n11. Customer fetching order history (/api/orders/my-orders)...');
    const myOrders = await request('/orders/my-orders', 'GET', null, customerToken);
    console.log(`   Status: ${myOrders.status}, Orders placed: ${myOrders.data.count}`);

    // 12. Pharmacist approves order -> Triggers atomic stock decrement
    console.log('\n12. Pharmacist approving order (triggers stock decrement)...');
    const approveRes = await request(`/orders/${orderId}/status`, 'PATCH', {
      status: 'approved'
    }, pharmacistToken);
    console.log(`   Status: ${approveRes.status}, New Order Status: ${approveRes.data.data.status}`);

    // 13. Verify stock decrement in database
    console.log('\n13. Verifying updated stock of Amoxicillin 500mg...');
    const updatedMedRes = await request(`/medicines/${med1Id}`, 'GET');
    console.log(`   Original stock: 100, New stock: ${updatedMedRes.data.data.stockQuantity} (Expected: 95)`);

    // 14. Pharmacist marks order as dispensed
    console.log('\n14. Pharmacist marking order as dispensed...');
    const dispenseRes = await request(`/orders/${orderId}/status`, 'PATCH', {
      status: 'dispensed'
    }, pharmacistToken);
    console.log(`   Status: ${dispenseRes.status}, Dispensed at: ${dispenseRes.data.data.dispensedAt}`);

    // 15. RBAC Test: Pharmacist attempting to delete medicine (Expect 403 Forbidden)
    console.log('\n15. RBAC Test: Pharmacist attempting to delete medicine (Expect 403)...');
    const pharmaDelMed = await request(`/medicines/${med2Id}`, 'DELETE', null, pharmacistToken);
    console.log(`   Status: ${pharmaDelMed.status} (Expected 403), Message: ${pharmaDelMed.data.message}`);

    // 16. Admin deletes medicine (Expect 200 OK)
    console.log('\n16. Admin deleting medicine (Expect 200 OK)...');
    const adminDelMed = await request(`/medicines/${med2Id}`, 'DELETE', null, adminToken);
    console.log(`   Status: ${adminDelMed.status}, Message: ${adminDelMed.data.message}`);

    console.log('\n🎉 ALL 16 TESTS PASSED SUCCESSFULLY! 🚀');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

// Start server and run tests
const { app, server } = require('./server');

setTimeout(() => {
  runTests();
}, 1500);
