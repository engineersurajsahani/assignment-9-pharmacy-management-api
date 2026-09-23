require('dotenv').config();

const PORT = process.env.PORT || 5050;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const ADMIN_KEY = process.env.ADMIN_REGISTER_KEY || 'pharmacyAdmin2026';

let passed = 0;
let failed = 0;
const testDetails = [];

function recordResult(testName, success, details = '') {
  if (success) {
    passed++;
    console.log(`\x1b[32m✔ PASS\x1b[0m : ${testName}`);
  } else {
    failed++;
    console.log(`\x1b[31m✘ FAIL\x1b[0m : ${testName} - ${details}`);
  }
  testDetails.push({ testName, success, details });
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { raw: await res.text() };
  }
  return { status: res.status, data };
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(` PHARMACY & HEALTHCARE STORE API - FULL TEST SUITE`);
  console.log(` Target Server: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const uniqueId = Date.now();
  const customerEmail = `customer_${uniqueId}@example.com`;
  const pharmacistEmail = `pharmacist_${uniqueId}@example.com`;
  const adminEmail = `admin_${uniqueId}@example.com`;
  const password = 'SecurePassword123!';

  let customerToken = null;
  let pharmacistToken = null;
  let adminToken = null;
  let createdMedicineId = null;
  let createdMedicine2Id = null;
  let createdOrderId = null;

  try {
    // ----------------------------------------------------
    // 1. BASE & HEALTH CHECK ENDPOINTS
    // ----------------------------------------------------
    console.log('\n--- 1. Base & Health Endpoints ---');
    {
      const res = await request('/');
      recordResult(
        'GET / (Welcome documentation & endpoints)',
        res.status === 200 && res.data.success === true && res.data.endpoints.medicines === '/api/medicines'
      );
    }
    {
      const res = await request('/api/health');
      recordResult(
        'GET /api/health (Health check & status)',
        res.status === 200 && res.data.status === 'healthy'
      );
    }

    // ----------------------------------------------------
    // 2. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
    // ----------------------------------------------------
    console.log('\n--- 2. Authentication & RBAC ---');
    {
      // Register Customer
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Jane Customer',
          email: customerEmail,
          password: password,
          phone: '+1-555-0199',
        },
      });
      const ok = res.status === 201 && res.data.success && res.data.data.token && res.data.data.user.role === 'customer';
      if (ok) customerToken = res.data.data.token;
      recordResult('POST /api/auth/register (Customer Registration)', ok, JSON.stringify(res.data));
    }

    {
      // Duplicate Registration should fail with 400
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Duplicate Jane',
          email: customerEmail,
          password: password,
        },
      });
      recordResult('POST /api/auth/register (Duplicate Email 400 rejection)', res.status === 400 && !res.data.success);
    }

    {
      // Register Staff with Invalid Admin Secret Key (Should Fail 403)
      const res = await request('/api/auth/register-staff', {
        method: 'POST',
        body: {
          name: 'Unauthorized Staff',
          email: `fake_${uniqueId}@example.com`,
          password: password,
          role: 'pharmacist',
          adminSecretKey: 'invalid_admin_secret',
        },
      });
      recordResult('POST /api/auth/register-staff (Invalid Secret Key 403 Forbidden)', res.status === 403 && !res.data.success);
    }

    {
      // Register Pharmacist with Valid Key
      const res = await request('/api/auth/register-staff', {
        method: 'POST',
        body: {
          name: 'Dr. Alex Pharmacist',
          email: pharmacistEmail,
          password: password,
          role: 'pharmacist',
          adminSecretKey: ADMIN_KEY,
        },
      });
      const ok = res.status === 201 && res.data.success && res.data.data.token && res.data.data.user.role === 'pharmacist';
      if (ok) pharmacistToken = res.data.data.token;
      recordResult('POST /api/auth/register-staff (Pharmacist Registration)', ok, JSON.stringify(res.data));
    }

    {
      // Register Admin with Valid Key
      const res = await request('/api/auth/register-staff', {
        method: 'POST',
        body: {
          name: 'Super Admin',
          email: adminEmail,
          password: password,
          role: 'admin',
          adminSecretKey: ADMIN_KEY,
        },
      });
      const ok = res.status === 201 && res.data.success && res.data.data.token && res.data.data.user.role === 'admin';
      if (ok) adminToken = res.data.data.token;
      recordResult('POST /api/auth/register-staff (Admin Registration)', ok, JSON.stringify(res.data));
    }

    {
      // Customer Login
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: { email: customerEmail, password: password },
      });
      recordResult('POST /api/auth/login (Customer Login)', res.status === 200 && res.data.success && !!res.data.data.token);
    }

    {
      // Login with Invalid Credentials (Should Fail 401)
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: { email: customerEmail, password: 'WrongPassword999!' },
      });
      recordResult('POST /api/auth/login (Invalid Password 401 Unauthorized)', res.status === 401 && !res.data.success);
    }

    {
      // Get User Profile (Protected)
      const res = await request('/api/auth/profile', { token: customerToken });
      recordResult(
        'GET /api/auth/profile (Authenticated Customer Profile)',
        res.status === 200 && res.data.success && res.data.data.email === customerEmail
      );
    }

    {
      // Get User Profile Without Token (Should Fail 401)
      const res = await request('/api/auth/profile');
      recordResult('GET /api/auth/profile (Missing Token 401 Unauthorized)', res.status === 401 && !res.data.success);
    }

    // ----------------------------------------------------
    // 3. MEDICINE CATALOG & INVENTORY MANAGEMENT
    // ----------------------------------------------------
    console.log('\n--- 3. Medicine Catalog & RBAC ---');
    {
      // Customer attempts to create medicine (Should Fail 403 Forbidden)
      const res = await request('/api/medicines', {
        method: 'POST',
        token: customerToken,
        body: {
          name: `Unauthorized Med ${uniqueId}`,
          brand: 'PharmaCo',
          category: 'Antibiotics',
          dosageForm: 'Tablet',
          price: 15.99,
          stockQuantity: 50,
          expiryDate: '2027-12-31',
        },
      });
      recordResult('POST /api/medicines (Customer Forbidden 403)', res.status === 403);
    }

    {
      // Pharmacist creates Medicine 1 (Requires Prescription)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 180); // 6 months from now
      const res = await request('/api/medicines', {
        method: 'POST',
        token: pharmacistToken,
        body: {
          name: `Amoxicillin 500mg - ${uniqueId}`,
          brand: 'HealthPharm Labs',
          category: 'Antibiotics',
          dosageForm: 'Capsule',
          price: 20.00,
          stockQuantity: 100,
          requiresPrescription: true,
          expiryDate: expiryDate.toISOString().split('T')[0],
        },
      });
      const ok = res.status === 201 && res.data.success && res.data.data._id;
      if (ok) createdMedicineId = res.data.data._id;
      recordResult('POST /api/medicines (Pharmacist creates prescription medicine)', ok, JSON.stringify(res.data));
    }

    {
      // Admin creates Medicine 2 (Expiring in 10 days)
      const expirySoon = new Date();
      expirySoon.setDate(expirySoon.getDate() + 10);
      const res = await request('/api/medicines', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `Paracetamol Syrup - ${uniqueId}`,
          brand: 'MediCare Pharma',
          category: 'Pain Relief',
          dosageForm: 'Syrup',
          price: 8.50,
          stockQuantity: 50,
          requiresPrescription: false,
          expiryDate: expirySoon.toISOString().split('T')[0],
        },
      });
      const ok = res.status === 201 && res.data.success && res.data.data._id;
      if (ok) createdMedicine2Id = res.data.data._id;
      recordResult('POST /api/medicines (Admin creates expiring-soon medicine)', ok, JSON.stringify(res.data));
    }

    {
      // Public / Customer lists Medicines with search, filter & pagination
      const res = await request(`/api/medicines?search=Amoxicillin&category=Antibiotics&page=1&limit=10`);
      const ok = res.status === 200 && res.data.success && Array.isArray(res.data.data.medicines) && res.data.data.total >= 1;
      recordResult('GET /api/medicines (Public search, filter & pagination)', ok, `Count: ${res.data?.data?.count}`);
    }

    {
      // Public / Customer views single medicine by ID
      const res = await request(`/api/medicines/${createdMedicineId}`);
      recordResult(
        'GET /api/medicines/:id (Get single medicine by ID)',
        res.status === 200 && res.data.success && res.data.data._id === createdMedicineId
      );
    }

    {
      // Pharmacist Updates Medicine price and stock
      const res = await request(`/api/medicines/${createdMedicineId}`, {
        method: 'PUT',
        token: pharmacistToken,
        body: {
          price: 25.00,
          stockQuantity: 90,
        },
      });
      recordResult(
        'PUT /api/medicines/:id (Pharmacist updates price & stockQuantity)',
        res.status === 200 && res.data.success && res.data.data.price === 25 && res.data.data.stockQuantity === 90
      );
    }

    // ----------------------------------------------------
    // 4. ORDER LIFECYCLE & ATOMIC INVENTORY DEDUCTION
    // ----------------------------------------------------
    console.log('\n--- 4. Order Management & Inventory Workflow ---');
    {
      // Customer attempts to order prescription medicine without prescriptionNotes (Should Fail 400)
      const res = await request('/api/orders', {
        method: 'POST',
        token: customerToken,
        body: {
          items: [{ medicineId: createdMedicineId, quantity: 2 }],
          prescriptionNotes: '',
        },
      });
      recordResult('POST /api/orders (Missing prescriptionNotes for Rx med 400 rejection)', res.status === 400 && !res.data.success);
    }

    {
      // Customer places valid order with prescription notes
      const res = await request('/api/orders', {
        method: 'POST',
        token: customerToken,
        body: {
          items: [{ medicineId: createdMedicineId, quantity: 2 }],
          prescriptionNotes: 'Rx#98412 Dr. Smith - Take twice daily after meals',
        },
      });
      const ok = res.status === 201 && res.data.success && res.data.data._id && res.data.data.status === 'pending' && res.data.data.totalAmount === 50;
      if (ok) createdOrderId = res.data.data._id;
      recordResult('POST /api/orders (Customer creates valid Order with status pending)', ok, JSON.stringify(res.data));
    }

    {
      // Customer orders more quantity than available stock (Should Fail 400)
      const res = await request('/api/orders', {
        method: 'POST',
        token: customerToken,
        body: {
          items: [{ medicineId: createdMedicineId, quantity: 99999 }],
          prescriptionNotes: 'Rx test notes',
        },
      });
      recordResult('POST /api/orders (Insufficient Stock 400 rejection)', res.status === 400 && !res.data.success);
    }

    {
      // Customer views their own orders
      const res = await request('/api/orders/my-orders', { token: customerToken });
      const ok = res.status === 200 && res.data.success && Array.isArray(res.data.data) && res.data.data.some(o => o._id === createdOrderId);
      recordResult('GET /api/orders/my-orders (Customer views own order history)', ok);
    }

    {
      // Customer views single order by ID
      const res = await request(`/api/orders/${createdOrderId}`, { token: customerToken });
      recordResult('GET /api/orders/:id (Customer views specific order details)', res.status === 200 && res.data.data._id === createdOrderId);
    }

    {
      // Pharmacist views all orders across the pharmacy
      const res = await request('/api/orders', { token: pharmacistToken });
      const ok = res.status === 200 && res.data.success && Array.isArray(res.data.data.orders);
      recordResult('GET /api/orders (Pharmacist views all system orders with pagination)', ok, `Count: ${res.data?.data?.count}`);
    }

    {
      // Customer tries to view all orders (Should Fail 403 Forbidden)
      const res = await request('/api/orders', { token: customerToken });
      recordResult('GET /api/orders (Customer Forbidden 403 from global orders)', res.status === 403);
    }

    {
      // Pharmacist approves order -> triggers atomic inventory deduction (stock 90 -> 88)
      const res = await request(`/api/orders/${createdOrderId}/status`, {
        method: 'PATCH',
        token: pharmacistToken,
        body: { status: 'approved' },
      });
      recordResult(
        'PATCH /api/orders/:id/status (Pharmacist transitions status pending -> approved)',
        res.status === 200 && res.data.success && res.data.data.status === 'approved'
      );
    }

    {
      // Verify atomic stock deduction occurred on Medicine
      const res = await request(`/api/medicines/${createdMedicineId}`);
      recordResult(
        'Atomic Inventory Stock Deduction (Stock 90 -> 88 on approval)',
        res.status === 200 && res.data.data.stockQuantity === 88,
        `Current stockQuantity: ${res.data?.data?.stockQuantity}`
      );
    }

    {
      // Pharmacist dispenses order -> 'dispensed'
      const res = await request(`/api/orders/${createdOrderId}/status`, {
        method: 'PATCH',
        token: pharmacistToken,
        body: { status: 'dispensed' },
      });
      recordResult(
        'PATCH /api/orders/:id/status (Pharmacist transitions status approved -> dispensed)',
        res.status === 200 && res.data.success && res.data.data.status === 'dispensed'
      );
    }

    // ----------------------------------------------------
    // 5. REPORTS & EXPIRING MEDICINE ALERTS
    // ----------------------------------------------------
    console.log('\n--- 5. Reports & Expiry Alerts ---');
    {
      // Pharmacist checks Expiring Medicines (/api/medicines/expiring)
      const res = await request('/api/medicines/expiring', { token: pharmacistToken });
      const ok = res.status === 200 && res.data.success && Array.isArray(res.data.data.medicines);
      recordResult('GET /api/medicines/expiring (Pharmacist views expiring medicines within 30 days)', ok, `Count: ${res.data?.data?.count}`);
    }

    {
      // Admin checks Expiring Medicines Report (/api/reports/expiring-soon)
      const res = await request('/api/reports/expiring-soon', { token: adminToken });
      const ok = res.status === 200 && res.data.success && Array.isArray(res.data.data.medicines);
      recordResult('GET /api/reports/expiring-soon (Admin views expiring-soon report)', ok, `Count: ${res.data?.data?.count}`);
    }

    {
      // Customer attempts to access expiring report (Should Fail 403 Forbidden)
      const res = await request('/api/reports/expiring-soon', { token: customerToken });
      recordResult('GET /api/reports/expiring-soon (Customer Forbidden 403)', res.status === 403);
    }

    // ----------------------------------------------------
    // 6. DELETION & ROLE PRIVILEGES
    // ----------------------------------------------------
    console.log('\n--- 6. Deletion & Role Privileges ---');
    {
      // Pharmacist tries to delete medicine (Only Admin can delete -> Should Fail 403)
      const res = await request(`/api/medicines/${createdMedicine2Id}`, {
        method: 'DELETE',
        token: pharmacistToken,
      });
      recordResult('DELETE /api/medicines/:id (Pharmacist Forbidden 403 - Only Admin allowed)', res.status === 403);
    }

    {
      // Admin deletes medicine (Should Succeed 200)
      const res = await request(`/api/medicines/${createdMedicine2Id}`, {
        method: 'DELETE',
        token: adminToken,
      });
      recordResult('DELETE /api/medicines/:id (Admin deletes medicine successfully 200)', res.status === 200 && res.data.success);
    }

    // ----------------------------------------------------
    // 7. ROUTE 404 & ERROR HANDLING
    // ----------------------------------------------------
    console.log('\n--- 7. 404 & Global Error Handling ---');
    {
      const res = await request('/api/non-existent-endpoint');
      recordResult('Global 404 Route Handler', res.status === 404 && res.data.success === false);
    }

  } catch (err) {
    console.error('Test runner encountered an unhandled error:', err);
  }

  console.log(`\n======================================================`);
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log(` Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
