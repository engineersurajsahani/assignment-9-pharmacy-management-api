# Pharmacy & Healthcare Store REST API (Assignment 09)

A production-grade Pharmacy Management & Medicine Ordering REST API built with Node.js, Express.js, MongoDB Atlas (Mongoose), and Role-Based Access Control (RBAC) powered by JSON Web Tokens (JWT).

## 🌟 Key Features

- **Multi-Tier Role-Based Access Control (RBAC)**: Distinct permissions for `Customer`, `Pharmacist`, and `Admin` users.
- **Secure Authentication**: Password hashing using `bcryptjs` and stateless session handling via signed `JWT` tokens.
- **Staff Provisioning**: Secure registration endpoint for Pharmacist and Admin staff using `ADMIN_SECRET_KEY` validation.
- **Medicine Inventory Management**: Comprehensive CRUD operations with search, category filters, and expiry alert queries.
- **Expiring Stock Reports**: Queries for drugs expiring within the next 30 days (`GET /api/medicines/expiring` & `GET /api/reports/expiring-soon`).
- **Atomic Inventory Stock Deduction**: When orders are approved or dispensed, stock quantity is automatically decremented atomically in MongoDB with concurrency & stock availability guards.
- **Robust Error Handling**: Structured JSON error responses for invalid tokens, unauthorized access (401), forbidden role permissions (403), resource not found (404), and validation failures (400).

---

## 👥 Role-Based Permission Matrix

| Endpoint / Action | Customer | Pharmacist | Admin | Access Level |
| :--- | :---: | :---: | :---: | :--- |
| `POST /api/auth/register` | ✅ | ❌ | ❌ | Public |
| `POST /api/auth/register-staff` | ❌ | ✅ | ✅ | Admin Key / Admin Token |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | Public |
| `GET /api/auth/profile` | ✅ | ✅ | ✅ | Authenticated |
| `GET /api/medicines` | ✅ | ✅ | ✅ | Public |
| `GET /api/medicines/expiring` | ❌ | ✅ | ✅ | Pharmacist / Admin |
| `GET /api/reports/expiring-soon` | ❌ | ✅ | ✅ | Pharmacist / Admin |
| `POST /api/medicines` | ❌ | ✅ | ✅ | Pharmacist / Admin |
| `PUT /api/medicines/:id` | ❌ | ✅ | ✅ | Pharmacist / Admin |
| `DELETE /api/medicines/:id` | ❌ | ❌ | ✅ | **Admin Only** |
| `POST /api/orders` | ✅ | ❌ | ❌ | Customer Only |
| `GET /api/orders/my-orders` | ✅ | ❌ | ❌ | Customer Only |
| `GET /api/orders` | ❌ | ✅ | ✅ | Pharmacist / Admin |
| `PATCH /api/orders/:id/status` | ❌ | ✅ | ✅ | Pharmacist / Admin |

---

## 🛠️ Tech Stack & Dependencies

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database & ODM**: MongoDB Atlas / Mongoose
- **Security & Auth**: JSON Web Token (`jsonwebtoken`), `bcryptjs`, `cors`
- **Environment Management**: `dotenv`
- **Development Tooling**: `nodemon`

---

## 🏗️ Project Architecture

```
assignment-09-pharmacy-api/
├── config/
│   └── db.js                 # MongoDB connection logic
├── controllers/
│   ├── authController.js     # User registration, login, profile & staff creation
│   ├── medicineController.js # Medicine CRUD & expiring stock queries
│   └── orderController.js    # Order lifecycle & atomic stock deductions
├── middleware/
│   ├── auth.js               # JWT verification & user payload attachment
│   └── roleGuard.js          # authorizeRoles('admin', 'pharmacist', 'customer')
├── models/
│   ├── Medicine.js           # Medicine catalog schema
│   ├── Order.js              # Order subdocument schema
│   └── User.js               # User schema with bcrypt & JWT methods
├── routes/
│   ├── authRoutes.js         # /api/auth endpoints
│   ├── medicineRoutes.js     # /api/medicines endpoints
│   ├── orderRoutes.js        # /api/orders endpoints
│   └── reportRoutes.js       # /api/reports endpoints
├── tests/
│   └── test-api.js           # Automated integration & RBAC verification test
├── .env                      # Local environment configuration
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore configuration
├── package.json              # Dependencies & scripts
├── postman_collection.json   # Ready-to-import Postman collection
├── server.js                 # Application entry point
└── README.md                 # Project documentation
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root directory (refer to `.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pharmacy_db
JWT_SECRET=super_secret_jwt_key_pharmacy_2026
JWT_EXPIRE=30d
ADMIN_SECRET_KEY=admin_secret_pharmacy_key_2026
```

---

## 🚀 Installation & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Start Production Server**:
   ```bash
   npm start
   ```

---

## 🧪 Automated Testing & Verification

Run the automated integration test script:

```bash
npm test
```

The verification test executes the following automated suite:
1. Cleans test database and starts test server.
2. Registers 3 distinct user tiers (`customer`, `pharmacist`, `admin`).
3. Verifies JWT login & profile retrieval.
4. **RBAC Guard Assertion**: Confirms `POST /api/medicines` by Customer returns **`403 Forbidden`**.
5. Adds expiring and non-expiring medicines as Pharmacist.
6. Verifies `GET /api/medicines/expiring` (expiring in 30 days).
7. Customer places multi-item order.
8. Server auto-calculates total amount based on DB unit prices.
9. Pharmacist approves order, triggering **atomic stock decrements** in MongoDB.
10. Verifies remaining stock in Medicine collection.
11. Admin deletes medicine; verifies Pharmacist is forbidden (`403`) from deleting.

---

## 📮 Postman Collection

Import `postman_collection.json` into Postman to test all endpoints across all 3 user roles with pre-configured header tokens.
