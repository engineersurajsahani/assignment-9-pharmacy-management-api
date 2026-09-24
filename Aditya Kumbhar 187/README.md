# Assignment 09: Pharmacy & Healthcare Store API with RBAC & JWT

**Student Name:** Aditya Kumbhar  
**Roll No / ID:** 187  
**Track:** Backend Development  
Live Link: https://assignment-9-pharmacy-management-api-w2pn.onrender.com
---

## 📌 Project Overview

A Pharmacy Management & M
edicine Ordering REST API built with Node.js, Express.js, MongoDB (Mongoose), and JSON Web Tokens (JWT) with Role-Based Access Control (RBAC).
The system supports thr ee user roles:
1. **Customer**: Browse medicines, place orders, view order history.
2. **Pharmacist**: Manage medicine catalog, view orders, approve/reject orders (triggers automatic stock deduction), and check expiring medicines.
3. **Admin**: Full access including staff registration, medicine deletion, inventory updates, and order management.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB / MongoDB Atlas (Mongoose ODM)
- **Authentication & Security:** JWT (jsonwebtoken), bcryptjs, cors, dotenv
- **Development Tool:** nodemon

---

## 📁 Project Structure

```text
Aditya Kumbhar 187, assignment 9/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── authController.js     # User registration, login & profile
│   ├── medicineController.js # Medicine CRUD & expiring stock queries
│   └── orderController.js    # Order lifecycle & atomic inventory deduction
├── middleware/
│   ├── auth.js               # JWT verification
│   └── roleGuard.js          # Role-based access control middleware
├── models/
│   ├── Medicine.js           # Medicine Mongoose schema
│   ├── Order.js              # Order Mongoose schema
│   └── User.js               # User Mongoose schema (Customer, Pharmacist, Admin)
├── routes/
│   ├── authRoutes.js         # /api/auth routes
│   ├── medicineRoutes.js     # /api/medicines routes
│   ├── orderRoutes.js        # /api/orders routes
│   └── reportRoutes.js       # /api/reports routes
├── .env.example              # Sample environment variables
├── .env                      # Local environment configuration
├── .gitignore                # Git ignore rules
├── package.json              # Project metadata & dependencies
├── Pharmacy_API.postman_collection.json # Ready-to-import Postman Collection
├── README.md                 # Project documentation
└── server.js                 # Express application entrypoint
```

---

## 👥 Role-Based Permission Matrix

| Endpoint / Action | Method | Customer | Pharmacist | Admin |
|---|:---:|:---:|:---:|:---:|
| `/api/auth/register` (Customer Register) | POST | ✅ | ❌ | ❌ |
| `/api/auth/register-staff` (Staff Register) | POST | ❌ | ✅ | ✅ |
| `/api/auth/login` | POST | ✅ | ✅ | ✅ |
| `/api/auth/profile` | GET | ✅ | ✅ | ✅ |
| `/api/medicines` (Catalog) | GET | ✅ | ✅ | ✅ |
| `/api/medicines/:id` | GET | ✅ | ✅ | ✅ |
| `/api/medicines` (Add Drug) | POST | ❌ | ✅ | ✅ |
| `/api/medicines/:id` (Update Stock/Price) | PUT | ❌ | ✅ | ✅ |
| `/api/medicines/:id` (Delete Drug) | DELETE | ❌ | ❌ | ✅ |
| `/api/medicines/expiring` (Expiring stock) | GET | ❌ | ✅ | ✅ |
| `/api/reports/expiring-soon` | GET | ❌ | ✅ | ✅ |
| `/api/orders` (Place Order) | POST | ✅ | ❌ | ❌ |
| `/api/orders/my-orders` | GET | ✅ | ❌ | ❌ |
| `/api/orders` (View All Orders) | GET | ❌ | ✅ | ✅ |
| `/api/orders/:id/status` (Approve/Reject) | PATCH | ❌ | ✅ | ✅ |

---

## 🚀 Setup & Installation

### 1. Clone or Open the Project
```bash
cd "Aditya Kumbhar 187, assignment 9"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory (or copy from `.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pharmacy_db
JWT_SECRET=supersecretjwtkey123
JWT_EXPIRES_IN=7d
ADMIN_SECRET_KEY=adminsecretkey123
```

### 4. Run the Server
```bash
# Production mode
npm start

# Development mode (with nodemon auto-restart)
npm run dev
```

---

## 📋 API Endpoints & Sample Payloads

### 1. Auth Endpoints

#### Register Customer
`POST /api/auth/register`
```json
{
  "name": "Aditya Customer",
  "email": "customer@example.com",
  "password": "password123"
}
```

#### Register Staff (Pharmacist / Admin)
`POST /api/auth/register-staff`
```json
{
  "name": "Sarah Pharmacist",
  "email": "pharmacist@example.com",
  "password": "password123",
  "role": "Pharmacist",
  "adminKey": "adminsecretkey123"
}
```

#### Login
`POST /api/auth/login`
```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

---

### 2. Medicine Endpoints

#### Get All Medicines / Search
`GET /api/medicines?search=Paracetamol&category=Analgesic`

#### Add Medicine (Pharmacist / Admin)
`POST /api/medicines`  
*Header:* `Authorization: Bearer <token>`
```json
{
  "name": "Amoxicillin 500mg",
  "brand": "GSK",
  "category": "Antibiotic",
  "dosageForm": "Capsule",
  "price": 15.50,
  "stockQuantity": 100,
  "requiresPrescription": true,
  "expiryDate": "2026-12-31T00:00:00.000Z"
}
```

#### Update Stock / Price (Pharmacist / Admin)
`PUT /api/medicines/:id`  
*Header:* `Authorization: Bearer <token>`
```json
{
  "price": 18.00,
  "stockQuantity": 120
}
```

#### Delete Medicine (Admin Only)
`DELETE /api/medicines/:id`  
*Header:* `Authorization: Bearer <adminToken>`

---

### 3. Order Endpoints

#### Place Order (Customer)
`POST /api/orders`  
*Header:* `Authorization: Bearer <customerToken>`
```json
{
  "items": [
    {
      "medicine": "65f1234567890abcdef12345",
      "quantity": 2
    }
  ],
  "prescriptionNotes": "Take 1 tablet after food twice daily"
}
```

#### Update Order Status (Pharmacist / Admin)
`PATCH /api/orders/:id/status`  
*Header:* `Authorization: Bearer <pharmacistToken>`
```json
{
  "status": "approved"
}
```
*(Note: Approving an order automatically decrements medicine stock quantities).*

---

## 📮 Postman Collection

Import `Pharmacy_API.postman_collection.json` into Postman to test all endpoints across Customer, Pharmacist, and Admin roles.
