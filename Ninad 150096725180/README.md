# 💊 Assignment 09: Pharmacy & Healthcare Store REST API

A production-grade **Pharmacy Management & Medicine Ordering REST API** built with **Node.js, Express.js, MongoDB / Mongoose, and JWT-based Role-Based Access Control (RBAC)**.

---

## 🌟 Key Features

1. **Multi-Tier RBAC Architecture**:
   - `Customer`: Browse medicines, place orders (with prescription notes), view personal order history.
   - `Pharmacist`: Add & update medicine inventory, view reports (expiring drugs, low-stock), approve/dispense orders.
   - `Admin`: Full system access including drug deletion, staff registration, and inventory summaries.
2. **Atomic Inventory Management**:
   - Real-time stock decrement when an order transitions from `pending` to `approved`.
   - Automated rollback handling to guarantee data consistency.
   - Restores inventory if an approved order is subsequently cancelled.
3. **Advanced MongoDB Aggregations**:
   - Expiring medicines query (within 30 days).
   - Low-stock inventory alert pipeline.
   - Category-based inventory valuation analytics.
4. **Secure JWT & Password Hashing**:
   - Passwords hashed using `bcryptjs` with salt rounds.
   - Standardized Bearer token verification.
   - Protected Staff Registration via `ADMIN_SECRET_KEY` or Admin token.

---

## 📁 Project Architecture

```text
Ninad 150096725180/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── authController.js     # JWT, user registration & login
│   ├── medicineController.js # Medicine CRUD & expiring stock query
│   ├── orderController.js    # Order lifecycle & atomic inventory deductions
│   └── reportController.js   # Aggregation reports (expiring, low stock, summaries)
├── middleware/
│   ├── auth.js               # JWT verification & req.user attachment
│   ├── roleGuard.js          # Role-based access control (RBAC)
│   └── errorHandler.js       # Centralized error handler
├── models/
│   ├── Medicine.js           # Medicine schema with indexing
│   ├── Order.js              # Order schema with nested items & status
│   └── User.js               # User schema with bcrypt hooks
├── routes/
│   ├── authRoutes.js         # /api/auth routes
│   ├── medicineRoutes.js     # /api/medicines routes
│   ├── orderRoutes.js        # /api/orders routes
│   └── reportRoutes.js       # /api/reports routes
├── .env                      # Environment configurations
├── .env.example              # Example environment variables
├── .gitignore
├── package.json
├── server.js                 # Express application entry point
├── postman_collection.json   # Postman collection with all 3 roles
└── README.md
```

---

## 👥 Role-Based Permission Matrix

| Endpoint / Action | Method | Customer | Pharmacist | Admin |
|---|:---:|:---:|:---:|:---:|
| `/api/auth/register` (Customer) | `POST` | ✅ | ❌ | ❌ |
| `/api/auth/register-staff` (Staff with Admin Key) | `POST` | ❌ | ✅ | ✅ |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ |
| `/api/auth/profile` | `GET` | ✅ | ✅ | ✅ |
| `/api/medicines` (Browse catalog) | `GET` | ✅ | ✅ | ✅ |
| `/api/medicines/:id` (View details) | `GET` | ✅ | ✅ | ✅ |
| `/api/medicines` (Add medicine) | `POST` | ❌ | ✅ | ✅ |
| `/api/medicines/:id` (Update stock/price) | `PUT` | ❌ | ✅ | ✅ |
| `/api/medicines/:id` (Delete medicine) | `DELETE` | ❌ | ❌ | ✅ |
| `/api/medicines/expiring` (Expiring stock) | `GET` | ❌ | ✅ | ✅ |
| `/api/orders` (Place order) | `POST` | ✅ | ❌ | ❌ |
| `/api/orders/my-orders` (Order history) | `GET` | ✅ | ❌ | ❌ |
| `/api/orders` (List all orders) | `GET` | ❌ | ✅ | ✅ |
| `/api/orders/:id/status` (Approve/Dispense) | `PATCH` | ❌ | ✅ | ✅ |
| `/api/reports/expiring-soon` | `GET` | ❌ | ✅ | ✅ |
| `/api/reports/low-stock` | `GET` | ❌ | ✅ | ✅ |
| `/api/reports/inventory-summary` | `GET` | ❌ | ✅ | ✅ |

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) running locally on port `27017` or MongoDB Atlas URI.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create or verify `.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pharmacy_db
JWT_SECRET=supersecretjwtkey_assignment09_pharmacy_2026
JWT_EXPIRES_IN=1d
ADMIN_SECRET_KEY=AdminPharmacySecretKey2026!
```

### 4. Run Server
```bash
# Production mode
npm start

# Development mode with nodemon
npm run dev
```

---

## 🧪 Testing with Postman
Import `postman_collection.json` into Postman to test all workflows across Customer, Pharmacist, and Admin roles.
