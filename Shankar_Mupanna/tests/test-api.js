const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

const PORT = 5001;
process.env.PORT = PORT;
process.env.NODE_ENV = 'test';

let mongod;
let server;

// Helper to make HTTP requests
const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:${PORT}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  try {
    console.log('--- STARTING PHARMACY API VERIFICATION TESTS ---');

    // 1. Initialize In-Memory MongoDB Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;

    await mongoose.connect(uri);
    console.log('✅ Connected to In-Memory MongoDB instance');

    const app = require('../server');

    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
    });

    // 2. Health check
    const health = await request('/');
    console.log('1. Health Check status:', health.status, 'Message:', health.body.message);
    if (health.status !== 200) throw new Error('Health check failed');

    // 3. User Registrations across 3 Tiers
    console.log('\n2. Registering users across 3 tiers (Customer, Pharmacist, Admin)...');
    
    // Customer
    const customerRes = await request('/api/auth/register', 'POST', {
      name: 'John Customer',
      email: 'customer@pharmacy.com',
      password: 'password123',
      phone: '1234567890',
      address: '123 Main St'
    });
    console.log('Customer Registration status:', customerRes.status, 'Role:', customerRes.body.user.role);
    if (customerRes.status !== 201) throw new Error('Customer registration failed');
    const customerToken = customerRes.body.token;

    // Pharmacist
    const pharmacistRes = await request('/api/auth/register-staff', 'POST', {
      name: 'Alice Pharmacist',
      email: 'pharmacist@pharmacy.com',
      password: 'password123',
      role: 'pharmacist',
      adminKey: process.env.ADMIN_SECRET_KEY || 'admin_secret_pharmacy_key_2026'
    });
    console.log('Pharmacist Registration status:', pharmacistRes.status, 'Role:', pharmacistRes.body.user.role);
    if (pharmacistRes.status !== 201) throw new Error('Pharmacist registration failed');
    const pharmacistToken = pharmacistRes.body.token;

    // Admin
    const adminRes = await request('/api/auth/register-staff', 'POST', {
      name: 'Boss Admin',
      email: 'admin@pharmacy.com',
      password: 'password123',
      role: 'admin',
      adminKey: process.env.ADMIN_SECRET_KEY || 'admin_secret_pharmacy_key_2026'
    });
    console.log('Admin Registration status:', adminRes.status, 'Role:', adminRes.body.user.role);
    if (adminRes.status !== 201) throw new Error('Admin registration failed');
    const adminToken = adminRes.body.token;

    // 4. User Login Test
    console.log('\n3. Testing login endpoint...');
    const loginRes = await request('/api/auth/login', 'POST', {
      email: 'customer@pharmacy.com',
      password: 'password123'
    });
    console.log('Login status:', loginRes.status, 'Success:', loginRes.body.success);
    if (loginRes.status !== 200 || !loginRes.body.token) throw new Error('Login failed');

    // 5. Test User Profile Endpoint
    console.log('\n4. Testing GET /api/auth/profile...');
    const profileRes = await request('/api/auth/profile', 'GET', null, customerToken);
    console.log('Profile status:', profileRes.status, 'User Email:', profileRes.body.user.email);
    if (profileRes.status !== 200) throw new Error('Profile fetch failed');

    // 6. RBAC Guard Test: Customer trying to add medicine (Expect 403 Forbidden)
    console.log('\n5. Testing RBAC: Customer attempting to POST /api/medicines (Should return 403 Forbidden)...');
    const forbiddenAdd = await request('/api/medicines', 'POST', {
      name: 'Amoxicillin 500mg',
      brand: 'PharmaCo',
      category: 'Antibiotic',
      dosageForm: 'Capsule',
      price: 15.50,
      stockQuantity: 100,
      requiresPrescription: true,
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    }, customerToken);
    console.log('Customer Add Medicine status:', forbiddenAdd.status, 'Message:', forbiddenAdd.body.message);
    if (forbiddenAdd.status !== 403) throw new Error(`RBAC failed! Customer got status ${forbiddenAdd.status} instead of 403`);
    console.log('✅ RBAC 403 Forbidden correctly enforced for Customer role!');

    // 7. Pharmacist adding medicines
    console.log('\n6. Pharmacist adding medicines to catalog...');
    
    // Drug 1 (Expiring soon - 15 days)
    const drug1Res = await request('/api/medicines', 'POST', {
      name: 'Amoxicillin 500mg',
      brand: 'PharmaCo',
      category: 'Antibiotic',
      dosageForm: 'Capsule',
      price: 15.50,
      stockQuantity: 50,
      requiresPrescription: true,
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    }, pharmacistToken);
    console.log('Add Drug 1 (Amoxicillin) status:', drug1Res.status, 'ID:', drug1Res.body.data._id);
    if (drug1Res.status !== 201) throw new Error('Failed to add drug 1');
    const drug1Id = drug1Res.body.data._id;

    // Drug 2 (Not expiring soon - 180 days)
    const drug2Res = await request('/api/medicines', 'POST', {
      name: 'Paracetamol 650mg',
      brand: 'HealthCare',
      category: 'Analgesic',
      dosageForm: 'Tablet',
      price: 5.00,
      stockQuantity: 200,
      requiresPrescription: false,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    }, pharmacistToken);
    console.log('Add Drug 2 (Paracetamol) status:', drug2Res.status, 'ID:', drug2Res.body.data._id);
    if (drug2Res.status !== 201) throw new Error('Failed to add drug 2');
    const drug2Id = drug2Res.body.data._id;

    // 8. Test Browse Catalog (Public) with search & filter
    console.log('\n7. Public browsing catalog with category filter...');
    const catalogRes = await request('/api/medicines?category=Antibiotic');
    console.log('Catalog query status:', catalogRes.status, 'Found count:', catalogRes.body.count);
    if (catalogRes.status !== 200 || catalogRes.body.count !== 1) throw new Error('Catalog filter failed');

    // 9. Test Expiring Medicines Reports
    console.log('\n8. Pharmacist querying expiring-soon medicines (expiring in 30 days)...');
    const expiringRes = await request('/api/medicines/expiring', 'GET', null, pharmacistToken);
    console.log('/api/medicines/expiring status:', expiringRes.status, 'Expiring drugs count:', expiringRes.body.count);
    if (expiringRes.status !== 200 || expiringRes.body.count !== 1) throw new Error('Expiring query failed');
    console.log('Expiring Drug Name:', expiringRes.body.data[0].name);

    const reportRes = await request('/api/reports/expiring-soon', 'GET', null, pharmacistToken);
    console.log('/api/reports/expiring-soon status:', reportRes.status, 'Expiring drugs count:', reportRes.body.count);
    if (reportRes.status !== 200 || reportRes.body.count !== 1) throw new Error('Report expiring query failed');

    // 10. Customer placing an order
    console.log('\n9. Customer placing an order...');
    const orderRes = await request('/api/orders', 'POST', {
      items: [
        { medicine: drug1Id, quantity: 10 },
        { medicine: drug2Id, quantity: 5 }
      ],
      prescriptionNotes: 'Doctor prescription attached for Amoxicillin'
    }, customerToken);
    console.log('Place Order status:', orderRes.status, 'Total Amount:', orderRes.body.data.totalAmount, 'Status:', orderRes.body.data.status);
    if (orderRes.status !== 201) throw new Error('Failed to place order');
    const orderId = orderRes.body.data._id;

    // Expected totalAmount: (15.50 * 10) + (5.00 * 5) = 155 + 25 = 180
    if (orderRes.body.data.totalAmount !== 180) {
      throw new Error(`Total amount calculation mismatch! Expected 180, got ${orderRes.body.data.totalAmount}`);
    }
    console.log('✅ Order total amount calculated accurately by server: $180');

    // 11. Customer viewing order history
    console.log('\n10. Customer viewing order history...');
    const myOrdersRes = await request('/api/orders/my-orders', 'GET', null, customerToken);
    console.log('My Orders status:', myOrdersRes.status, 'Count:', myOrdersRes.body.count);
    if (myOrdersRes.status !== 200 || myOrdersRes.body.count !== 1) throw new Error('My orders failed');

    // 12. Pharmacist approving order & triggering atomic stock deduction
    console.log('\n11. Pharmacist approving order status to "approved" (Triggers Stock Deduction)...');
    const approveRes = await request(`/api/orders/${orderId}/status`, 'PATCH', {
      status: 'approved'
    }, pharmacistToken);
    console.log('Approve Order status:', approveRes.status, 'New Status:', approveRes.body.data.status);
    if (approveRes.status !== 200 || approveRes.body.data.status !== 'approved') throw new Error('Order approval failed');

    // Verify Stock Deduction
    console.log('\n12. Verifying stock deduction in Medicine collection...');
    const checkDrug1 = await request(`/api/medicines?search=Amoxicillin`);
    const newStockDrug1 = checkDrug1.body.data[0].stockQuantity;
    console.log(`Amoxicillin Initial Stock: 50 | Order Quantity: 10 | Remaining Stock: ${newStockDrug1}`);
    if (newStockDrug1 !== 40) throw new Error(`Stock deduction failed! Expected 40, got ${newStockDrug1}`);

    const checkDrug2 = await request(`/api/medicines?search=Paracetamol`);
    const newStockDrug2 = checkDrug2.body.data[0].stockQuantity;
    console.log(`Paracetamol Initial Stock: 200 | Order Quantity: 5 | Remaining Stock: ${newStockDrug2}`);
    if (newStockDrug2 !== 195) throw new Error(`Stock deduction failed! Expected 195, got ${newStockDrug2}`);

    console.log('✅ Atomic stock deduction verified successfully!');

    // 13. Admin deleting medicine (RBAC check for Delete)
    console.log('\n13. Testing Admin DELETE /api/medicines/:id...');
    // Pharmacist trying to delete (Expect 403)
    const forbiddenDelete = await request(`/api/medicines/${drug2Id}`, 'DELETE', null, pharmacistToken);
    console.log('Pharmacist Delete status (Should be 403):', forbiddenDelete.status);
    if (forbiddenDelete.status !== 403) throw new Error('RBAC failed for delete! Pharmacist should be forbidden');

    // Admin deleting (Expect 200)
    const adminDelete = await request(`/api/medicines/${drug2Id}`, 'DELETE', null, adminToken);
    console.log('Admin Delete status:', adminDelete.status, 'Message:', adminDelete.body.message);
    if (adminDelete.status !== 200) throw new Error('Admin delete failed');

    console.log('\n==================================================');
    console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (server) {
      server.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
};

runTests();
