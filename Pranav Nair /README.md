# 💊 Pharmacy & Healthcare Store API

A production-grade Pharmacy Management & Medicine Ordering REST API with Role-Based Access Control (RBAC) using Node.js, Express, MongoDB, JWT, and bcryptjs.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Role-Based Permissions](#role-based-permissions)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)

## ✨ Features

- **Three-Tier RBAC** — Admin, Pharmacist, Customer with strict permission barriers
- **JWT Authentication** — Stateless token-based auth with role claims
- **Medicine CRUD** — Full inventory management with search & category filters
- **Prescription Flags** — Required prescription validation for restricted drugs
- **Order Management** — Place, approve, dispense with atomic stock deduction
- **Expiring Stock Alerts** — Aggregation query for medicines expiring within 30 days
- **Secure Passwords** — bcrypt hashing with salt rounds

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs

## 👥 Role-Based Permissions

| Endpoint | Customer | Pharmacist | Admin |
|----------|:--------:|:----------:|:-----:|
| Register customer | ✅ | ❌ | ❌ |
| Register staff | ❌ | ❌ | ✅ |
| Browse catalog | ✅ | ✅ | ✅ |
| Add medicine | ❌ | ✅ | ✅ |
| Update medicine | ❌ | ✅ | ✅ |
| Delete medicine | ❌ | ❌ | ✅ |
| Place order | ✅ | ❌ | ❌ |
| View my orders | ✅ | ❌ | ❌ |
| View all orders | ❌ | ✅ | ✅ |
| Approve/reject order | ❌ | ✅ | ✅ |
| Expiring stock report | ❌ | ✅ | ✅ |

## 📁 Project Structure

```
pharmacy-api/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── authController.js     # JWT & password logic
│   ├── medicineController.js # Medicine CRUD & expiring stock
│   └── orderController.js    # Order lifecycle & stock deduction
├── middleware/
│   ├── auth.js               # Verify JWT
│   └── roleGuard.js          # authorizeRoles('admin', 'pharmacist')
├── models/
│   ├── User.js               # User with role enum
│   ├── Medicine.js            # Medicine with prescription flag
│   └── Order.js               # Order with items subdocument
├── routes/
│   ├── authRoutes.js
│   ├── medicineRoutes.js
│   └── orderRoutes.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## 🚀 Installation

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd pharmacy-api
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start server
npm run dev
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register customer |
| POST | `/api/auth/register-staff` | Admin Key | Register pharmacist/admin |
| POST | `/api/auth/login` | Public | Login → JWT |
| GET | `/api/auth/profile` | Auth | Get profile |

#### Register Customer
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Register Staff (requires admin key)
```json
POST /api/auth/register-staff
{
  "name": "Dr. Smith",
  "email": "smith@pharmacy.com",
  "password": "password123",
  "role": "pharmacist",
  "registrationKey": "pharmacy-admin-secret-key"
}
```

### Medicine Inventory

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/medicines` | Public | List with search & filter |
| GET | `/api/medicines/:id` | Public | Get by ID |
| GET | `/api/medicines/expiring` | Pharmacist/Admin | Expiring in 30 days |
| POST | `/api/medicines` | Pharmacist/Admin | Add medicine |
| PUT | `/api/medicines/:id` | Pharmacist/Admin | Update medicine |
| DELETE | `/api/medicines/:id` | Admin only | Delete medicine |

#### Add Medicine
```json
POST /api/medicines
Authorization: Bearer <token>
{
  "name": "Amoxicillin",
  "brand": "PharmaCo",
  "category": "Antibiotic",
  "dosageForm": "Capsule",
  "price": 12.99,
  "stockQuantity": 500,
  "requiresPrescription": true,
  "expiryDate": "2027-01-15"
}
```

#### Search & Filter
```bash
GET /api/medicines?search=amoxicillin&category=Antibiotic
```

### Orders

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/orders` | Customer | Place order |
| GET | `/api/orders/my-orders` | Customer | Order history |
| GET | `/api/orders` | Pharmacist/Admin | All orders |
| PATCH | `/api/orders/:id/status` | Pharmacist/Admin | Update status |

#### Place Order
```json
POST /api/orders
Authorization: Bearer <customer-token>
{
  "items": [
    { "medicine": "<medicine-id>", "quantity": 2 },
    { "medicine": "<medicine-id>", "quantity": 1 }
  ],
  "prescriptionNotes": "Dr. Smith prescribed for 7 days"
}
```

#### Approve Order (deducts stock)
```json
PATCH /api/orders/<order-id>/status
Authorization: Bearer <pharmacist-token>
{ "status": "approved" }
```

## 🧪 Testing Guide

1. Register a customer, pharmacist, and admin
2. Try adding medicine with customer token → **403 Forbidden**
3. Add medicine with pharmacist token → **201 Created**
4. Place order as customer → **201 Created**
5. Approve order as pharmacist → **200 OK** (stock deducted)
6. Check medicine stock → decremented by order quantity

## 📊 Grading Rubric

| Component | Marks |
|-----------|:-----:|
| MongoDB Schema Modeling | 25 |
| JWT RBAC Middleware | 25 |
| Medicine CRUD & Filters | 20 |
| Order Processing & Stock Deduction | 15 |
| Architecture & Error Handling | 15 |
| **Total** | **100** |

---

**Assignment 09:** Pharmacy & Healthcare Store API with RBAC & JWT
