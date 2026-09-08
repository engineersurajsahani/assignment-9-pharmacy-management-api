# 💊 Pharmacy Management & Medicine Ordering REST API

A production-grade RESTful API built with **Node.js**, **Express.js**, **MongoDB Atlas / Mongoose**, and **JWT-based Role-Based Access Control (RBAC)**. The application models multi-tier user workflows across **Customer**, **Pharmacist**, and **Admin** roles with strict security barriers and atomic inventory decrements.

---

## 🌟 Features & Highlights

- 🔐 **Multi-Role RBAC Authentication**: Secure JWT authorization supporting `Customer`, `Pharmacist`, and `Admin` tiers.
- 🛡️ **Protected Staff Registration**: `POST /api/auth/register-staff` protected by an `ADMIN_SECRET_KEY` barrier.
- 💊 **Inventory & Expiry Tracking**: Search, filter catalog, and run MongoDB queries for drugs expiring within 30 days (`GET /api/reports/expiring-soon`).
- 📦 **Order Processing & Atomic Stock Decrement**: Placing customer orders and triggering automatic atomic stock decrements (`$inc: { stockQuantity: -qty }`) when orders are approved by Pharmacists/Admins.
- 🧪 **Complete Test Suite**: Built-in automated integration test runner (`npm test`).
- 📬 **Postman Collection**: Included `pharmacy_api_postman_collection.json` with pre-configured requests, environment variables, and token handlers for all 3 user roles.

---

## 👥 Role-Based Permission Matrix

| Endpoint / Action | Customer | Pharmacist | Admin |
| :--- | :---: | :---: | :---: |
| `POST /api/auth/register` (Customer) | ✅ | ❌ | ❌ |
| `POST /api/auth/register-staff` (Admin key) | ❌ | ✅ | ✅ |
| `GET /api/auth/profile` | ✅ | ✅ | ✅ |
| `GET /api/medicines` (Browse catalog) | ✅ | ✅ | ✅ |
| `GET /api/medicines/expiring` (Expiring stock) | ❌ | ✅ | ✅ |
| `GET /api/reports/expiring-soon` | ❌ | ✅ | ✅ |
| `POST /api/medicines` (Add medicine) | ❌ | ✅ | ✅ |
| `PUT /api/medicines/:id` (Update stock/price) | ❌ | ✅ | ✅ |
| `DELETE /api/medicines/:id` (Remove drug) | ❌ | ❌ | ✅ |
| `POST /api/orders` (Place order) | ✅ | ❌ | ❌ |
| `GET /api/orders/my-orders` (View history) | ✅ | ❌ | ❌ |
| `GET /api/orders` (List all orders) | ❌ | ✅ | ✅ |
| `PATCH /api/orders/:id/status` (Approve/Reject) | ❌ | ✅ | ✅ |

---

## 🏗️ Project Architecture

```
assignment-09-pharmacy-api/
├── config/
│   └── db.js                 # MongoDB connection handler
├── controllers/
│   ├── authController.js     # User registration, login & profile
│   ├── medicineController.js # Medicine CRUD & expiring stock aggregation
│   └── orderController.js    # Order lifecycle & atomic inventory deduction
├── middleware/
│   ├── auth.js               # JWT verification middleware
│   └── roleGuard.js          # authorizeRoles('admin', 'pharmacist', 'customer')
├── models/
│   ├── Medicine.js           # Medicine schema (stock, price, expiryDate, etc.)
│   ├── Order.js              # Order schema (customer, items, totalAmount, status)
│   └── User.js               # User schema (bcrypt password hashing, roles)
├── routes/
│   ├── authRoutes.js         # Routes for authentication
│   ├── medicineRoutes.js     # Routes for medicine catalog
│   ├── orderRoutes.js        # Routes for placing & managing orders
│   └── reportRoutes.js       # Reports routes (expiring stock)
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
├── pharmacy_api_postman_collection.json # Postman Collection v2.1
├── README.md
├── server.js                 # Server entry point
└── test-api.js               # Automated integration test suite
```

---

## 🛠️ Environment Variables & Setup

Create a `.env` file in the root directory based on `.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pharmacy_db
JWT_SECRET=pharmacy_jwt_secret_key_super_secret_123!
JWT_EXPIRES_IN=24h
ADMIN_SECRET_KEY=admin_secret_pharmacy_2026
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start
```

---

## 🧪 Testing

To run the automated integration test suite covering authentication, RBAC barriers, expiring stock queries, and atomic stock decrements:

```bash
npm test
```

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/auth`)

- **`POST /api/auth/register`**
  - **Body**: `{ "name": "John Customer", "email": "john@example.com", "password": "password123" }`
  - **Response**: Returns created user object and `token`.

- **`POST /api/auth/register-staff`**
  - **Body**: `{ "name": "Dr. Smith", "email": "smith@pharmacy.com", "password": "pass", "role": "pharmacist", "adminSecretKey": "admin_secret_pharmacy_2026" }`
  - **Header**: `x-admin-key: admin_secret_pharmacy_2026` (Alternative to body field)

- **`POST /api/auth/login`**
  - **Body**: `{ "email": "john@example.com", "password": "password123" }`
  - **Response**: Returns JWT token and user profile.

- **`GET /api/auth/profile`**
  - **Header**: `Authorization: Bearer <token>`

---

### 💊 Medicine Management (`/api/medicines`)

- **`GET /api/medicines`** (Public)
  - Query Params: `?search=Amoxicillin&category=Antibiotic`

- **`GET /api/medicines/expiring`** or **`GET /api/reports/expiring-soon`** (Pharmacist / Admin)
  - Queries medicines expiring within the next 30 days.

- **`POST /api/medicines`** (Pharmacist / Admin)
  - **Body**:
    ```json
    {
      "name": "Amoxicillin 500mg",
      "brand": "GSK",
      "category": "Antibiotic",
      "dosageForm": "Capsule",
      "price": 15.50,
      "stockQuantity": 100,
      "requiresPrescription": true,
      "expiryDate": "2026-10-15T00:00:00.000Z"
    }
    ```

- **`PUT /api/medicines/:id`** (Pharmacist / Admin)
  - Update stock or price.

- **`DELETE /api/medicines/:id`** (Admin Only)
  - Delete medicine record.

---

### 📦 Order & Prescription Management (`/api/orders`)

- **`POST /api/orders`** (Customer Only)
  - **Body**:
    ```json
    {
      "items": [
        { "medicineId": "<MEDICINE_ID>", "quantity": 2 }
      ],
      "prescriptionNotes": "Take twice daily after meal"
    }
    ```
  - Calculates unit price and total amount automatically.

- **`GET /api/orders/my-orders`** (Customer Only)
  - View logged-in customer's order history.

- **`GET /api/orders`** (Pharmacist / Admin)
  - View all customer orders.

- **`PATCH /api/orders/:id/status`** (Pharmacist / Admin)
  - **Body**: `{ "status": "approved" }`
  - **Behavior**: Verifies stock availability and triggers **atomic stock deduction** (`$inc: { stockQuantity: -quantity }`).

---

## 📬 Postman Collection

Import `pharmacy_api_postman_collection.json` into Postman to test all endpoints. It includes automatic token collection scripts when executing login requests for Customer, Pharmacist, and Admin roles.
