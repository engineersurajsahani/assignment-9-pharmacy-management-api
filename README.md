# 💊 Pharmacy & Healthcare Store REST API (Assignment 9)

🚀 **Live Deployment Links:**
- **Render:** [https://samarth-assignment-9-pharmacy-management-api.onrender.com](https://samarth-assignment-9-pharmacy-management-api.onrender.com)
- **Vercel:** [https://samarth-assignment-9-pharmacy-manag.vercel.app](https://samarth-assignment-9-pharmacy-manag.vercel.app)

---

- **Name:** Samarth Navale
- **Roll No:** 150096725148
- **Cohort:** Sam Altman

---

A production-ready RESTful API for a **Pharmacy Management & Medicine Ordering System** built with **Node.js**, **Express.js**, **MongoDB**, **Mongoose**, and **JWT Role-Based Access Control (RBAC)** across three tiers (`Admin`, `Pharmacist`, `Customer`).

---

## 🚀 Features

- 🔐 **Multi-tier JWT Authentication & RBAC**: Role-based access control protecting administrative, pharmacist, and customer endpoints.
- 💊 **Medicine Inventory Management**: CRUD operations for drugs with category filtering, keyword searching, and query for expiring drugs (within 30 days).
- 📦 **Order Processing & Inventory Decrement**: Customers place medicine orders; upon staff approval, stock is automatically and atomically decremented.
- 📊 **Swagger API Documentation**: OpenAPI 3.0 specification available at `/api-docs`.
- 📮 **Postman Collection Included**: Complete collection with token variables and role tests.

---

## 📁 Project Folder Structure

```text
📂 Assignment9/
├── 📄 render.yaml
├── 📄 vercel.json
├── 📄 Assignment 9.txt
├── 📄 README.md
└── 📂 Samarth_Navale_150096725148/
    ├── 📄 server.js
    ├── 📄 package.json
    ├── 📄 .env & .env.example
    ├── 📄 .gitignore
    ├── 📄 render.yaml & vercel.json
    ├── 📄 README.md
    ├── 📂 config/
    │   ├── 📄 db.js
    │   └── 📄 swagger.js
    ├── 📂 models/
    │   ├── 📄 User.js
    │   ├── 📄 Medicine.js
    │   └── 📄 Order.js
    ├── 📂 middleware/
    │   ├── 📄 auth.js
    │   ├── 📄 roleGuard.js
    │   ├── 📄 logger.js
    │   └── 📄 errorHandler.js
    ├── 📂 controllers/
    │   ├── 📄 authController.js
    │   ├── 📄 medicineController.js
    │   └── 📄 orderController.js
    ├── 📂 routes/
    │   ├── 📄 authRoutes.js
    │   ├── 📄 medicineRoutes.js
    │   └── 📄 orderRoutes.js
    └── 📂 docs/
        ├── 📄 swagger.yaml
        └── 📄 Pharmacy_Management_API.postman_collection.json
```

---

## ⚙️ Installation & Setup

```bash
cd Samarth_Navale_150096725148
npm install
cp .env.example .env
npm start
```

API Server: `http://localhost:5000`  
Swagger UI: `http://localhost:5000/api-docs`

---

## 📋 API Endpoints Specification

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | Public | Register customer account |
| `POST` | `/api/auth/register-staff` | Admin Key | Register pharmacist/admin |
| `POST` | `/api/auth/login` | Public | Login with email/password, receive JWT |
| `GET` | `/api/auth/profile` | Auth | Get current user's profile |

### 💊 Medicines (`/api/medicines`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `GET` | `/api/medicines` | Public | List medicines with search & category filter |
| `GET` | `/api/medicines/expiring` | Pharmacist / Admin | Query drugs expiring in next 30 days |
| `GET` | `/api/medicines/:id` | Public | Get medicine details |
| `POST` | `/api/medicines` | Pharmacist / Admin | Add new medicine |
| `PUT` | `/api/medicines/:id` | Pharmacist / Admin | Update stock or price |
| `DELETE` | `/api/medicines/:id` | Admin Only | Delete drug from catalog |

### 📦 Orders (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `POST` | `/api/orders` | Customer | Place an order for medicines |
| `GET` | `/api/orders/my-orders` | Customer | View customer order history |
| `GET` | `/api/orders` | Pharmacist / Admin | List all orders |
| `PATCH` | `/api/orders/:id/status` | Pharmacist / Admin | Update status to approved/dispensed (decrements stock) |
