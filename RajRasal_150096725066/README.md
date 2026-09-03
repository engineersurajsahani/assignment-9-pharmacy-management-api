# 💊 Assignment 09: Pharmacy & Healthcare Store API with RBAC & JWT

---

## 🌐 Live Production Deployment on Render
- **Live Production URL:** [https://assignmentsexpressjsmongodbsupabasefireb-9hre.onrender.com](https://assignmentsexpressjsmongodbsupabasefireb-9hre.onrender.com)

> **Track:** Backend Development | **Level:** Intermediate | **Estimated Time:** 6–8 Hours  
> **Tech Stack:** Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcryptjs, dotenv

---

## 📌 1. Objective & Overview

Build a production-grade **Pharmacy Management & Medicine Ordering REST API** using **MongoDB Atlas** and **JWT-based Role-Based Access Control (RBAC)**. Students will model multi-role user workflows across three user tiers: `Admin`, `Pharmacist`, and `Customer`, enforcing strict permission barriers for sensitive operations like adding restricted prescription medicines and approving drug orders.

### Key Learning Outcomes:
- Designing complex schema relationships with nested order subdocuments and prescription verification flags.
- Advanced JWT authorization middleware capable of handling multi-role hierarchies.
- MongoDB Atlas aggregation for low-stock inventory alerts and expiring medicine queries.
- Atomic stock decrements when customer orders are marked as `approved`.
- Secure storage of environment secrets and clean MVC layered design.

---

## 🛠️ 2. Tech Stack & Dependencies

```bash
# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mongoose jsonwebtoken bcryptjs dotenv cors

# Install development tools
npm install -D nodemon
```

---

## 👥 3. Role-Based Permission Matrix

| Endpoint / Action | Customer | Pharmacist | Admin |
|---|:---:|:---:|:---:|
| `POST /api/auth/register` (Customer) | ✅ | ❌ | ❌ |
| `POST /api/auth/register-staff` (Admin key) | ❌ | ✅ | ✅ |
| `GET /api/medicines` (Browse catalog) | ✅ | ✅ | ✅ |
| `POST /api/medicines` (Add medicine) | ❌ | ✅ | ✅ |
| `PUT /api/medicines/:id` (Update stock/price) | ❌ | ✅ | ✅ |
| `DELETE /api/medicines/:id` (Remove drug) | ❌ | ❌ | ✅ |
| `POST /api/orders` (Place order) | ✅ | ❌ | ❌ |
| `PATCH /api/orders/:id/status` (Approve/Reject) | ❌ | ✅ | ✅ |
| `GET /api/reports/expiring-soon` | ❌ | ✅ | ✅ |

---

## 🗄️ 4. Mongoose Schemas

### 1. Medicine Schema (`models/Medicine.js`)
```javascript
const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true },
  category: { type: String, required: true }, // e.g., "Antibiotic", "Analgesic"
  dosageForm: { type: String, enum: ['Tablet', 'Capsule', 'Syrup', 'Injection'], required: true },
  price: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0 },
  requiresPrescription: { type: Boolean, default: false },
  expiryDate: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
```

### 2. Order Schema (`models/Order.js`)
```javascript
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  prescriptionNotes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'dispensed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
```

---

## 📋 5. API Endpoints Specification

### 🔐 Auth Routes

| Method | Endpoint | Access Level | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | Public | Register customer account |
| `POST` | `/api/auth/login` | Public | Login with email/password, receive JWT |
| `GET` | `/api/auth/profile` | Authenticated | Get current user's profile |

### 💊 Medicine Inventory Routes

| Method | Endpoint | Access Level | Description |
|---|---|:---:|---|
| `GET` | `/api/medicines` | Public | List medicines with search & category filter |
| `GET` | `/api/medicines/expiring` | Pharmacist / Admin | Query drugs expiring in the next 30 days |
| `POST` | `/api/medicines` | Pharmacist / Admin | Add new medicine |
| `PUT` | `/api/medicines/:id` | Pharmacist / Admin | Update stock or pricing |
| `DELETE` | `/api/medicines/:id` | Admin Only | Delete drug from database |

### 📦 Order & Prescription Routes

| Method | Endpoint | Access Level | Description |
|---|---|:---:|---|
| `POST` | `/api/orders` | Customer | Place an order for medicines |
| `GET` | `/api/orders/my-orders` | Customer | View customer order history |
| `GET` | `/api/orders` | Pharmacist / Admin | List all pending & processed orders |
| `PATCH` | `/api/orders/:id/status` | Pharmacist / Admin | Update status to `approved`/`dispensed` (Triggers stock deduction) |

---

## 🏗️ 6. Project Directory Architecture

```text
assignment-09-pharmacy-api/
├── config/
│   └── db.js                 # MongoDB Atlas connection
├── controllers/
│   ├── authController.js     # JWT & password logic
│   ├── medicineController.js # Medicine CRUD & expiring stock query
│   └── orderController.js    # Order lifecycle & inventory deductions
├── middleware/
│   ├── auth.js               # Verify JWT
│   └── roleGuard.js          # authorizeRoles('admin', 'pharmacist')
├── models/
│   ├── Medicine.js
│   ├── Order.js
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   ├── medicineRoutes.js
│   └── orderRoutes.js
├── .env.example              # MONGO_URI, JWT_SECRET, PORT
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## 🧪 7. Testing & Verification Guide

1. Create a customer, a pharmacist, and an admin user.
2. Attempt to add a medicine with a customer JWT; confirm the response is `403 Forbidden`.
3. Add a medicine using the pharmacist token.
4. Place an order as a customer, then approve the order as a pharmacist. Verify that the medicine `stockQuantity` is automatically decremented.

---

## 📊 8. Grading Rubric (100 Marks)

| Evaluation Component | Marks |
|---|:---:|
| **MongoDB Atlas Setup & Schema Modeling** | 25 |
| **JWT RBAC Middleware Hierarchy (Admin/Pharmacist/Customer)** | 25 |
| **Medicine Inventory CRUD & Expiring Stock Filters** | 20 |
| **Order Processing & Atomic Stock Deduction Logic** | 15 |
| **Architecture, Error Handling & Code Quality** | 15 |
| **Total Marks** | **100** |

---

## 📤 9. Submission Guidelines

- Submit your GitHub repository: `itm-assignment-09-pharmacy-api`.
- Include a Postman Collection demonstrating all 3 user roles with token headers.
