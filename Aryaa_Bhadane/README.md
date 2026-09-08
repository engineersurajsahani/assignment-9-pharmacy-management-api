# 💊 Pharmacy Management & Medicine Ordering REST API

> **Author:** Aryaa Bhadane  
> **Track:** Backend Development | **Tech Stack:** Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcryptjs, dotenv, cors

---

## 📌 1. Project Overview

A production-grade **Pharmacy Management & Medicine Ordering REST API** featuring **JWT-based Role-Based Access Control (RBAC)** across three distinct user tiers:
- **`Customer`**: Browse medicines, search/filter catalog, place orders with prescription validation, and view order history.
- **`Pharmacist`**: Add/update medicines, inspect drugs nearing expiry, review customer orders, and approve orders (triggering atomic stock deduction).
- **`Admin`**: Full administrative authority, including staff onboarding, inventory CRUD, deleting drug records, order oversight, and analytics.

---

## 🏗️ 2. Project Architecture & Directory Structure

All application components are organized within the `Aryaa_Bhadane/` directory adhering to a clean MVC (Model-View-Controller) layered architecture:

```text
Aryaa_Bhadane/
├── config/
│   └── db.js                 # MongoDB Atlas cloud connection
├── controllers/
│   ├── authController.js     # User registration, staff onboarding, login, profile
│   ├── medicineController.js # Medicine catalog CRUD & expiring queries
│   ├── orderController.js    # Order lifecycle & atomic stock deductions
│   └── reportController.js   # MongoDB Atlas aggregation reports
├── middleware/
│   ├── auth.js               # JWT verification & req.user extraction
│   ├── roleGuard.js          # authorizeRoles('admin', 'pharmacist', 'customer')
│   └── errorHandler.js       # Centralized 404 & error handlers
├── models/
│   ├── Medicine.js           # Medicine inventory schema & text indexes
│   ├── Order.js              # Order schema with nested items & status lifecycle
│   └── User.js               # User schema with bcrypt password hashing & RBAC
├── routes/
│   ├── authRoutes.js         # /api/auth routes
│   ├── medicineRoutes.js     # /api/medicines routes
│   ├── orderRoutes.js        # /api/orders routes
│   └── reportRoutes.js       # /api/reports routes
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules (node_modules, .env)
├── package.json              # Dependencies and npm scripts
├── server.js                 # Express application entry point
├── postman_collection.json   # Postman v2.1 collection covering all 3 roles
└── README.md                 # Complete documentation & deployment guide
```

---

## 👥 3. Role-Based Permission Matrix

| Endpoint / Action | Method | Customer | Pharmacist | Admin |
|---|:---:|:---:|:---:|:---:|
| `POST /api/auth/register` | `POST` | ✅ | ❌ | ❌ |
| `POST /api/auth/register-staff` *(Admin Key)* | `POST` | ❌ | ✅ | ✅ |
| `POST /api/auth/login` | `POST` | ✅ | ✅ | ✅ |
| `GET /api/auth/profile` | `GET` | ✅ | ✅ | ✅ |
| `GET /api/medicines` | `GET` | ✅ | ✅ | ✅ |
| `GET /api/medicines/:id` | `GET` | ✅ | ✅ | ✅ |
| `GET /api/medicines/expiring` | `GET` | ❌ | ✅ | ✅ |
| `POST /api/medicines` | `POST` | ❌ | ✅ | ✅ |
| `PUT /api/medicines/:id` | `PUT` | ❌ | ✅ | ✅ |
| `DELETE /api/medicines/:id` | `DELETE` | ❌ | ❌ | ✅ |
| `POST /api/orders` | `POST` | ✅ | ❌ | ❌ |
| `GET /api/orders/my-orders` | `GET` | ✅ | ❌ | ❌ |
| `GET /api/orders` | `GET` | ❌ | ✅ | ✅ |
| `GET /api/orders/:id` | `GET` | ✅ *(Own)* | ✅ | ✅ |
| `PATCH /api/orders/:id/status` | `PATCH` | ❌ | ✅ | ✅ |
| `GET /api/reports/expiring-soon` | `GET` | ❌ | ✅ | ✅ |
| `GET /api/reports/low-stock` | `GET` | ❌ | ✅ | ✅ |

---

## ⚙️ 4. Key Business Logic Implementations

### 1. JWT Authentication & Role-Based Access Control
- Passwords are encrypted using **`bcryptjs`** with a salt round factor of `10`.
- Passwords have `select: false` on the Mongoose schema to prevent accidental leakage.
- JWT tokens encode `{ id, role, email, name }` with a configurable expiration (`JWT_EXPIRE=24h`).
- `middleware/auth.js` validates tokens from `Authorization: Bearer <token>` and populates `req.user`.
- `middleware/roleGuard.js` enforces route authorization (e.g., `authorizeRoles('pharmacist', 'admin')`). Unauthorized attempts return `403 Forbidden`.

### 2. Staff Registration Guard (`ADMIN_REGISTRATION_KEY`)
- Public customer signup (`POST /api/auth/register`) strictly sets `role: 'customer'`, preventing privilege escalation.
- Staff creation (`POST /api/auth/register-staff`) requires `adminKey` matching `ADMIN_REGISTRATION_KEY` to onboard `pharmacist` or `admin` accounts.

### 3. Prescription Enforcement
- If any item in an order has `requiresPrescription: true`, the API mandates non-empty `prescriptionNotes`. Orders without notes are rejected with `400 Bad Request`.

### 4. Server-Side Price Verification
- Unit prices and total amounts are calculated dynamically from database medicine records, ignoring any spoofed client totals.

### 5. Atomic Stock Deduction on Approval
- When an order transitions from `pending` to `approved` via `PATCH /api/orders/:id/status`, stock is decremented atomically using MongoDB's conditional query:
  ```javascript
  await Medicine.findOneAndUpdate(
    { _id: item.medicine, stockQuantity: { $gte: item.quantity } },
    { $inc: { stockQuantity: -item.quantity } },
    { new: true }
  );
  ```
- If any medicine has insufficient stock, the transaction is immediately rolled back and returns a `400 Bad Request`.

### 6. MongoDB Atlas Aggregation Pipelines
- **Expiring-Soon Report (`GET /api/reports/expiring-soon`)**: Calculates days remaining (`daysUntilExpiry`) and financial risk value (`stockQuantity * price`), producing grouped summary metrics and category breakdowns via `$facet`.
- **Low-Stock Report (`GET /api/reports/low-stock`)**: Identifies items at or below a stock threshold and computes the required replenishment deficit.

--



## 🧪 7. Postman Collection & Testing Guide

A complete Postman collection is included at [`Aryaa_Bhadane/postman_collection.json`](./postman_collection.json).

### How to Import & Run in Postman:
1. Open **Postman**.
2. Click **Import** in the top-left corner.
3. Select or drag-and-drop `Aryaa_Bhadane/postman_collection.json`.
4. In the collection settings, ensure the `baseUrl` variable is set to:
   - `http://localhost:5000` (for local testing), OR
   - `https://your-service-name.onrender.com` (for live Render testing).

### Recommended Verification Flow:
1. **Onboard Users**:
   - `Register Customer (Public)` -> Logs in and saves `customerToken`.
   - `Register Pharmacist (Staff)` with `adminKey` -> Logs in and saves `pharmacistToken`.
   - `Register Admin (Staff)` with `adminKey` -> Logs in and saves `adminToken`.
2. **Verify RBAC Barriers**:
   - Run `Add Medicine as Customer` -> Receives `403 Forbidden`.
   - Run `Add Medicine (Pharmacist)` -> Receives `201 Created` and saves `sampleMedicineId`.
   - Run `Delete Medicine as Pharmacist` -> Receives `403 Forbidden`.
   - Run `Delete Medicine as Admin` -> Receives `200 OK`.
3. **Verify Prescription & Order Flow**:
   - Run `Place Order Without Required Notes` -> Receives `400 Bad Request`.
   - Run `Place Order as Customer (With Prescription Notes)` -> Receives `201 Created` with `pending` status.
   - Run `Approve Order & Deduct Stock Atomically (Pharmacist)` -> Receives `200 OK` and decrements medicine `stockQuantity`.
4. **Verify Aggregation Reports**:
   - Run `Expiring Soon Analytics Report` -> Returns aggregated summary, category breakdown, and risk valuations.
   - Run `Low Stock Inventory Alerts` -> Returns medicines below stock threshold.

---

## 📊 8. API Endpoint Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register customer account
- `POST /api/auth/register-staff` — Register staff (`pharmacist` or `admin`) using `adminKey`
- `POST /api/auth/login` — Authenticate and receive JWT
- `GET /api/auth/profile` — Get profile for authenticated user

### 💊 Medicine Inventory (`/api/medicines`)
- `GET /api/medicines` — Search, filter, and paginate medicine catalog
- `GET /api/medicines/:id` — Get single medicine details
- `GET /api/medicines/expiring?days=30` — Query medicines expiring within N days *(Pharmacist / Admin)*
- `POST /api/medicines` — Add new medicine *(Pharmacist / Admin)*
- `PUT /api/medicines/:id` — Update stock, price, or details *(Pharmacist / Admin)*
- `DELETE /api/medicines/:id` — Delete medicine *(Admin Only)*

### 📦 Orders & Prescriptions (`/api/orders`)
- `POST /api/orders` — Place order with prescription validation *(Customer Only)*
- `GET /api/orders/my-orders` — View customer's orders *(Customer Only)*
- `GET /api/orders` — List all orders across pharmacy *(Pharmacist / Admin)*
- `GET /api/orders/:id` — View specific order details *(Customer Owner / Pharmacist / Admin)*
- `PATCH /api/orders/:id/status` — Approve/dispense/cancel order with atomic stock updates *(Pharmacist / Admin)*

### 📊 Aggregation Reports (`/api/reports`)
- `GET /api/reports/expiring-soon?days=30` — Expiring stock analytics & financial risk report *(Pharmacist / Admin)*
- `GET /api/reports/low-stock?threshold=15` — Low stock replenishment alert report *(Pharmacist / Admin)*

---




DEPLOYMENT LINK: https://pharmacy-management-api-mhuc.onrender.com/
