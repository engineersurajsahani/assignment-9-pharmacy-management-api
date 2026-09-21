# 💊 Assignment 09: Pharmacy & Healthcare Store API with RBAC & JWT

**Name:** Rishi Thakker
**Roll No:** 150096725068
**Cohort:** Sam Altman

**Deployed Link:** https://assignment-9-pharmacy-management-api-p7bq.onrender.com/

Backend for a Pharmacy Management & Medicine Ordering system built with **Node.js, Express, MongoDB Atlas/Mongoose, and JWT-based Role-Based Access Control** across three roles: `customer`, `pharmacist`, `admin`.

## Features
- JWT authentication with roles baked into the token payload
- Staff (`pharmacist`/`admin`) accounts gated behind a shared admin key at registration
- Medicine catalog with search/category filtering and an "expiring in 30 days" report
- Order placement with live stock and prescription-requirement validation
- Atomic stock deduction the moment an order is approved (never double-deducts on re-save)

## API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a customer account |
| POST | `/api/auth/register-staff` | Admin key required | Register a `pharmacist` or `admin` account |
| POST | `/api/auth/login` | Public | Login, returns a JWT `token` |
| GET | `/api/auth/profile` | Token | Get current user's profile |

### Medicines
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/medicines` | Public | List medicines. Query: `?category=&name=` |
| GET | `/api/medicines/expiring` | Pharmacist / Admin | Medicines expiring in the next 30 days |
| POST | `/api/medicines` | Pharmacist / Admin | Add a new medicine |
| PUT | `/api/medicines/:id` | Pharmacist / Admin | Update stock or price |
| DELETE | `/api/medicines/:id` | Admin only | Delete a medicine |

### Orders
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/orders` | Customer | Place an order. Body: `items: [{ medicineId, quantity }], prescriptionNotes` |
| GET | `/api/orders/my-orders` | Customer | View own order history |
| GET | `/api/orders` | Pharmacist / Admin | List all orders. Query: `?status=` |
| PATCH | `/api/orders/:id/status` | Pharmacist / Admin | Update status (`approved` triggers stock deduction) |


## Folder Structure
```text
rishi-thakker-068-assignment-9/
├── config/
│   └── db.js
├── middleware/
│   ├── auth.js
│   ├── roleGuard.js
│   └── requestLogger.js
├── models/
│   ├── Medicine.js
│   ├── Order.js
│   └── User.js
├── router/
│   └── router.js
├── package.json
├── server.js
└── README.md
```
