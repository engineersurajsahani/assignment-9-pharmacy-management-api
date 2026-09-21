# 💊 Assignment 09: Pharmacy & Healthcare Store API with RBAC & JWT

**Name:** Rishi Thakker
**Roll No:** 068
**Cohort:** [Cohort]

Backend for a Pharmacy Management & Medicine Ordering system built with **Node.js, Express, MongoDB Atlas/Mongoose, and JWT-based Role-Based Access Control** across three roles: `customer`, `pharmacist`, `admin`.

## Features
- JWT authentication with roles baked into the token payload
- Staff (`pharmacist`/`admin`) accounts gated behind a shared admin key at registration
- Medicine catalog with search/category filtering and an "expiring in 30 days" report
- Order placement with live stock and prescription-requirement validation
- Atomic stock deduction the moment an order is approved (never double-deducts on re-save)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Run in dev mode (auto-restart)
npm run dev

# or run normally
npm start
```

MongoDB connection is configured directly in `config/db.js`.

## Authentication & Roles
Auth uses **JWT**, not sessions. After logging in, copy the returned `token` and send it on every
protected route as a request header:

```
token: <your JWT>
```

Every account starts as `customer` via `/api/auth/register`. To create a `pharmacist` or `admin`
account, use `/api/auth/register-staff` and pass the shared `adminKey` (set in `router/router.js`
as `STAFF_SECRET_KEY`) — change this before you submit if it needs to stay private.

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

## Testing Checklist (from assignment spec)
1. Create a customer, a pharmacist, and an admin user (pharmacist/admin via `/register-staff` + admin key).
2. Try adding a medicine with the customer's token → expect `403 Forbidden`.
3. Add a medicine using the pharmacist's token.
4. Place an order as the customer, then set its status to `approved` as the pharmacist — confirm the medicine's `stockQuantity` decrements automatically.

Import the routes above into Postman — send the JWT `token` as a plain header named `token`
(not `Authorization: Bearer`) on every protected request, and keep three separate
requests/environments for the customer, pharmacist, and admin tokens.

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
