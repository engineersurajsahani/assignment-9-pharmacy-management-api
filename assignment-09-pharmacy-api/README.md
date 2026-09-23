# 💊 Assignment 09: Pharmacy & Healthcare Store API

A production-style **REST API** for a Pharmacy Management and Medicine Ordering System built with **Node.js**, **Express.js**, **MongoDB Atlas**, and **JWT-based RBAC**.

RENDER LINK -  https://assignment-9-pharmacy-management-api-1.onrender.com



## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Environment Variables](#environment-variables)
- [Installation & Running](#installation--running)
- [API Endpoints](#api-endpoints)
- [Authentication & JWT](#authentication--jwt)
- [RBAC Permissions](#rbac-permissions)
- [Example Requests & Responses](#example-requests--responses)
- [Postman Testing Guide](#postman-testing-guide)

---

## Project Overview

This API powers a Pharmacy Management System with three user roles:

- **Customer** — registers, browses medicines, places orders, views their own order history
- **Pharmacist** — manages medicines (add/update), approves/rejects orders, views expiring medicines
- **Admin** — all pharmacist capabilities plus staff registration and medicine deletion

---

## Features

- ✅ JWT Authentication (7-day tokens)
- ✅ Role-Based Access Control (RBAC) middleware
- ✅ Customer & Staff registration with admin-key protection
- ✅ Full medicine CRUD with search & category filtering
- ✅ Expiring medicines report (within 30 days)
- ✅ Order placement with automatic price snapshot
- ✅ Atomic stock deduction on order approval (prevents negative stock)
- ✅ Double-deduction prevention (idempotent approval)
- ✅ Comprehensive error handling with appropriate HTTP status codes
- ✅ Password hashing with bcryptjs (never stored in plain text)

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | Web framework |
| MongoDB Atlas | Cloud database |
| Mongoose | ODM for MongoDB |
| jsonwebtoken | JWT generation and verification |
| bcryptjs | Password hashing |
| dotenv | Environment variable management |
| cors | Cross-Origin Resource Sharing |
| nodemon | Auto-restart in development |

---

## Project Structure

```
assignment-09-pharmacy-api/
├── config/
│   └── db.js                  # MongoDB Atlas connection
├── controllers/
│   ├── authController.js      # Auth logic (register, login, profile)
│   ├── medicineController.js  # Medicine CRUD + expiring report
│   └── orderController.js     # Order placement, status updates, stock deduction
├── middleware/
│   ├── auth.js                # JWT verification middleware
│   └── roleGuard.js           # RBAC factory middleware
├── models/
│   ├── Medicine.js            # Medicine schema
│   ├── Order.js               # Order schema with embedded items
│   └── User.js                # User schema with bcrypt hashing
├── routes/
│   ├── authRoutes.js          # /api/auth/* routes
│   ├── medicineRoutes.js      # /api/medicines/* routes
│   └── orderRoutes.js         # /api/orders/* routes
├── .env.example               # Required environment variable names
├── .gitignore
├── package.json
├── server.js                  # Express app entry point
└── README.md
```

---

## MongoDB Atlas Setup

1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account.
2. Create a new **Free Tier** cluster (M0).
3. In **Database Access**, create a database user with a username and password.
4. In **Network Access**, add your IP address (or `0.0.0.0/0` to allow all IPs for development).
5. In **Clusters**, click **Connect** → **Connect your application**.
6. Copy the connection string (it looks like `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority`).
7. Replace `<user>`, `<password>`, and `<dbname>` with your actual values.
8. Paste this as `MONGO_URI` in your `.env` file.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/pharmacy` |
| `JWT_SECRET` | Secret key for signing JWTs | `my_super_secret_key_2024` |
| `PORT` | Port the server listens on | `5000` |
| `ADMIN_KEY` | Key required for staff registration | `pharmacy_admin_2024` |

> ⚠️ **Never commit your `.env` file to version control.**

---

## Installation & Running

### Prerequisites

- Node.js v16+ installed
- A MongoDB Atlas account with a cluster

### Steps

```bash
# 1. Clone or navigate to the project folder
cd assignment-09-pharmacy-api

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, port, and admin key

# 4. Start the development server (with auto-restart)
npm run dev

# 5. Or start in production mode
npm start
```

The server will print:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
🚀 Server running on port 5000
📡 API available at http://localhost:5000
```

---

## API Endpoints

### Base URL
```
http://localhost:5000
```

### 🔐 Authentication Routes — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register a customer |
| POST | `/api/auth/register-staff` | Public + ADMIN_KEY | Register pharmacist or admin |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/profile` | JWT Required | Get current user profile |

### 💊 Medicine Routes — `/api/medicines`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/medicines` | Customer, Pharmacist, Admin | List all medicines (supports `?search=` and `?category=`) |
| GET | `/api/medicines/expiring` | Pharmacist, Admin | Medicines expiring within 30 days |
| POST | `/api/medicines` | Pharmacist, Admin | Add a new medicine |
| PUT | `/api/medicines/:id` | Pharmacist, Admin | Update a medicine |
| DELETE | `/api/medicines/:id` | Admin only | Delete a medicine |

### 📦 Order Routes — `/api/orders`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/orders` | Customer | Place a new order |
| GET | `/api/orders/my-orders` | Customer | View own order history |
| GET | `/api/orders` | Pharmacist, Admin | View all orders |
| PATCH | `/api/orders/:id/status` | Pharmacist, Admin | Update order status |

#### Valid Order Statuses
- `pending` → `approved` → `dispensed`
- `pending` → `cancelled`

---

## Authentication & JWT

All protected routes require a JWT in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

JWTs are signed with `JWT_SECRET` and expire in **7 days**. The token payload contains:
```json
{
  "id": "user_object_id",
  "email": "user@example.com",
  "role": "customer | pharmacist | admin"
}
```

---

## RBAC Permissions

| Action | Customer | Pharmacist | Admin |
|---|:---:|:---:|:---:|
| Register Customer (`POST /api/auth/register`) | ✅ | ❌ | ❌ |
| Register Staff (`POST /api/auth/register-staff`) | ❌ | ❌ | ✅ (via ADMIN_KEY) |
| Browse Medicines (`GET /api/medicines`) | ✅ | ✅ | ✅ |
| Add Medicine (`POST /api/medicines`) | ❌ | ✅ | ✅ |
| Update Medicine (`PUT /api/medicines/:id`) | ❌ | ✅ | ✅ |
| Delete Medicine (`DELETE /api/medicines/:id`) | ❌ | ❌ | ✅ |
| Expiring Report (`GET /api/medicines/expiring`) | ❌ | ✅ | ✅ |
| Place Order (`POST /api/orders`) | ✅ | ❌ | ❌ |
| View Own Orders (`GET /api/orders/my-orders`) | ✅ | ❌ | ❌ |
| View All Orders (`GET /api/orders`) | ❌ | ✅ | ✅ |
| Update Order Status (`PATCH /api/orders/:id/status`) | ❌ | ✅ | ✅ |

---

## Example Requests & Responses

### Register Customer

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Customer registered successfully.",
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Register Staff (Pharmacist/Admin)

**Request:**
```http
POST /api/auth/register-staff
Content-Type: application/json

{
  "name": "Dr. Sarah Smith",
  "email": "sarah@pharmacy.com",
  "password": "secure123",
  "role": "pharmacist",
  "adminKey": "pharmacy_admin_2024"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Pharmacist registered successfully.",
  "data": {
    "user": { "role": "pharmacist", ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "role": "customer", ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Add Medicine (Pharmacist/Admin)

**Request:**
```http
POST /api/medicines
Authorization: Bearer <pharmacist_token>
Content-Type: application/json

{
  "name": "Amoxicillin",
  "brand": "Amoxil",
  "category": "Antibiotics",
  "dosageForm": "Capsule",
  "price": 12.50,
  "stockQuantity": 200,
  "requiresPrescription": true,
  "expiryDate": "2026-12-31"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Medicine added successfully.",
  "data": {
    "medicine": {
      "_id": "64b2c3d4e5f6a7b8c9d0e1f2",
      "name": "Amoxicillin",
      "brand": "Amoxil",
      "category": "Antibiotics",
      "dosageForm": "Capsule",
      "price": 12.5,
      "stockQuantity": 200,
      "requiresPrescription": true,
      "expiryDate": "2026-12-31T00:00:00.000Z"
    }
  }
}
```

---

### Place Order (Customer)

**Request:**
```http
POST /api/orders
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "items": [
    {
      "medicine": "64b2c3d4e5f6a7b8c9d0e1f2",
      "quantity": 2
    }
  ],
  "prescriptionNotes": "Doctor prescribed for 7 days"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order placed successfully. Awaiting pharmacist approval.",
  "data": {
    "order": {
      "_id": "64c3d4e5f6a7b8c9d0e1f2a3",
      "customer": { "name": "John Doe", "email": "john@example.com" },
      "items": [
        {
          "medicine": { "name": "Amoxicillin", "brand": "Amoxil" },
          "quantity": 2,
          "unitPrice": 12.5
        }
      ],
      "totalAmount": 25,
      "status": "pending"
    }
  }
}
```

---

### Approve Order (Pharmacist/Admin) — Triggers Stock Deduction

**Request:**
```http
PATCH /api/orders/64c3d4e5f6a7b8c9d0e1f2a3/status
Authorization: Bearer <pharmacist_token>
Content-Type: application/json

{
  "status": "approved"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated to \"approved\" successfully.",
  "data": {
    "order": {
      "status": "approved",
      "items": [
        {
          "medicine": { "name": "Amoxicillin", "stockQuantity": 198 },
          "quantity": 2
        }
      ]
    }
  }
}
```
> Stock deducted: 200 → 198 automatically.

---

### 403 Forbidden Example (Customer tries to add medicine)

**Request:**
```http
POST /api/medicines
Authorization: Bearer <customer_token>
```

**Response (403):**
```json
{
  "success": false,
  "message": "Access denied. This action requires one of the following roles: pharmacist, admin."
}
```

---

## Postman Testing Guide

### Complete Workflow

#### 1. Register a Customer
```
POST /api/auth/register
Body: { "name": "Alice", "email": "alice@test.com", "password": "pass1234" }
```
Save the returned `token` as `customerToken` in Postman environment.

#### 2. Register a Pharmacist
```
POST /api/auth/register-staff
Body: { "name": "Bob", "email": "bob@pharmacy.com", "password": "pass1234", "role": "pharmacist", "adminKey": "<your ADMIN_KEY>" }
```
Save `token` as `pharmacistToken`.

#### 3. Register an Admin
```
POST /api/auth/register-staff
Body: { "name": "Carol Admin", "email": "carol@pharmacy.com", "password": "pass1234", "role": "admin", "adminKey": "<your ADMIN_KEY>" }
```
Save `token` as `adminToken`.

#### 4. Login (to refresh tokens)
```
POST /api/auth/login
Body: { "email": "alice@test.com", "password": "pass1234" }
```

#### 5. Test 403 — Customer tries to add medicine
```
POST /api/medicines
Headers: Authorization: Bearer {{customerToken}}
Body: { "name": "Test", ... }
→ Expected: 403 Forbidden
```

#### 6. Add Medicine as Pharmacist
```
POST /api/medicines
Headers: Authorization: Bearer {{pharmacistToken}}
Body: { "name": "Paracetamol", "brand": "Panadol", "category": "Analgesics", "dosageForm": "Tablet", "price": 5.00, "stockQuantity": 100, "requiresPrescription": false, "expiryDate": "2027-06-30" }
→ Save returned medicine _id as medicineId
```

#### 7. Browse Medicines
```
GET /api/medicines
Headers: Authorization: Bearer {{customerToken}}
Optional: ?search=para or ?category=Analgesics
```

#### 8. Place an Order as Customer
```
POST /api/orders
Headers: Authorization: Bearer {{customerToken}}
Body: { "items": [{ "medicine": "{{medicineId}}", "quantity": 3 }], "prescriptionNotes": "As directed" }
→ Save returned order _id as orderId
```

#### 9. Verify Customer Order History
```
GET /api/orders/my-orders
Headers: Authorization: Bearer {{customerToken}}
```

#### 10. Approve Order as Pharmacist → Check Stock Deduction
```
PATCH /api/orders/{{orderId}}/status
Headers: Authorization: Bearer {{pharmacistToken}}
Body: { "status": "approved" }
→ Check medicine stockQuantity dropped from 100 to 97
```
Verify: `GET /api/medicines` → stockQuantity should be 97.

#### 11. Test Expiring Medicines Report
```
GET /api/medicines/expiring
Headers: Authorization: Bearer {{pharmacistToken}}
→ Returns medicines with expiryDate within next 30 days
```
To test, first add a medicine with expiryDate within 30 days of today.

#### 12. Admin-Only Medicine Deletion
```
DELETE /api/medicines/{{medicineId}}
Headers: Authorization: Bearer {{adminToken}}
→ Expected: 200 OK

DELETE /api/medicines/{{medicineId}}
Headers: Authorization: Bearer {{pharmacistToken}}
→ Expected: 403 Forbidden
```

---

### Medicine Categories (valid enum values)
`Antibiotics`, `Analgesics`, `Antiviral`, `Antifungal`, `Vitamins`, `Supplements`, `Cardiovascular`, `Diabetes`, `Respiratory`, `Dermatology`, `Gastrointestinal`, `Neurological`, `Other`

### Dosage Forms (valid enum values)
`Tablet`, `Capsule`, `Syrup`, `Injection`, `Cream`, `Drops`, `Inhaler`, `Patch`, `Other`

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad Request (missing/invalid fields, insufficient stock) |
| 401 | Unauthorized (missing or invalid JWT) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found (medicine or order not found) |
| 409 | Conflict (duplicate email) |
| 500 | Internal Server Error |
