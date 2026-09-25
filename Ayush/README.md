# 💊 Pharmacy Management & Medicine Ordering API

A production-style REST API for a pharmacy/healthcare store, built with **Node.js, Express, MongoDB Atlas (Mongoose), and JWT-based RBAC** across three roles: `customer`, `pharmacist`, and `admin`.

## Features

- JWT authentication with bcrypt-hashed passwords
- Role-based access control middleware (`protect` + `authorizeRoles`)
- Gated staff registration (pharmacist/admin) via a shared `STAFF_REGISTRATION_KEY`
- Medicine catalog with search, category filter, and pagination
- Expiring-soon medicine report (next 30 days, configurable via `?days=`)
- Order placement with server-side price calculation and stock validation
- **Atomic stock deduction**: approving an order decrements `stockQuantity` for every item inside a MongoDB transaction — if any item lacks sufficient stock, the whole approval is rolled back
- Centralized error handling and 404 fallback

## Getting Started

```bash
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, STAFF_REGISTRATION_KEY
npm run dev             # nodemon, or `npm start` for plain node
```

Requires a MongoDB Atlas cluster (or any MongoDB instance — note: the atomic stock-deduction transaction requires a **replica set**, which Atlas provides by default).

## Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `PORT` | Server port (default 5000) |
| `STAFF_REGISTRATION_KEY` | Shared secret required to self-register as pharmacist/admin |

## Roles & Permissions

| Endpoint / Action | Customer | Pharmacist | Admin |
|---|:---:|:---:|:---:|
| `POST /api/auth/register` | ✅ | ❌ | ❌ |
| `POST /api/auth/register-staff` (key required) | ❌ | ✅ | ✅ |
| `GET /api/medicines` | ✅ | ✅ | ✅ |
| `GET /api/medicines/expiring` | ❌ | ✅ | ✅ |
| `POST /api/medicines` | ❌ | ✅ | ✅ |
| `PUT /api/medicines/:id` | ❌ | ✅ | ✅ |
| `DELETE /api/medicines/:id` | ❌ | ❌ | ✅ |
| `POST /api/orders` | ✅ | ❌ | ❌ |
| `GET /api/orders/my-orders` | ✅ | ❌ | ❌ |
| `GET /api/orders` | ❌ | ✅ | ✅ |
| `PATCH /api/orders/:id/status` | ❌ | ✅ | ✅ |

## API Reference

### Auth

- `POST /api/auth/register` — `{ name, email, password }` → customer account + JWT
- `POST /api/auth/register-staff` — `{ name, email, password, role, staffKey }` → pharmacist/admin + JWT
- `POST /api/auth/login` — `{ email, password }` → JWT
- `GET /api/auth/profile` — (auth) current user

### Medicines

- `GET /api/medicines?search=&category=&page=&limit=` — public catalog
- `GET /api/medicines/expiring?days=30` — pharmacist/admin
- `POST /api/medicines` — pharmacist/admin, body matches the Medicine schema
- `PUT /api/medicines/:id` — pharmacist/admin, partial update
- `DELETE /api/medicines/:id` — admin only

### Orders

- `POST /api/orders` — customer, body: `{ items: [{ medicine, quantity }], prescriptionNotes? }`. Rejects if any item `requiresPrescription` and no `prescriptionNotes` given, or if stock is insufficient.
- `GET /api/orders/my-orders` — customer, own history
- `GET /api/orders?status=` — pharmacist/admin, all orders
- `PATCH /api/orders/:id/status` — pharmacist/admin, body: `{ status: 'pending'|'approved'|'dispensed'|'cancelled' }`. First transition into `approved` atomically decrements stock for every line item.

## Testing Flow

1. Register a customer, then register a pharmacist and an admin via `/api/auth/register-staff` with the staff key.
2. Try `POST /api/medicines` with the customer's token → expect `403`.
3. Add a medicine using the pharmacist's token.
4. Place an order as the customer, then `PATCH .../status` with `approved` as the pharmacist. Confirm the medicine's `stockQuantity` dropped by the ordered amount.

## Project Structure

```
pharmacy-api/
├── config/db.js
├── controllers/{authController,medicineController,orderController}.js
├── middleware/{auth,roleGuard}.js
├── models/{User,Medicine,Order}.js
├── routes/{authRoutes,medicineRoutes,orderRoutes}.js
├── .env.example
├── server.js
└── package.json
```
