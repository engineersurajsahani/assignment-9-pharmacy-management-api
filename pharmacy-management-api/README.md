# 💊 Pharmacy & Healthcare Store API

A production-grade REST API for a pharmacy/medicine ordering system with **3-tier RBAC** (`customer` / `pharmacist` / `admin`), built with **Node.js, Express, MongoDB, Mongoose, and JWT**.

## Tech Stack

- Node.js + Express.js
- MongoDB + Mongoose
- JWT (`jsonwebtoken`) + `bcryptjs` for auth
- Role-based middleware supporting multi-role hierarchies (e.g. `authorizeRoles('pharmacist', 'admin')`)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **MongoDB**
   - Local: run `mongod` on `mongodb://127.0.0.1:27017`, or
   - Use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster and grab its connection string.

3. **Environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in `MONGO_URI`, `JWT_SECRET`, and `ADMIN_REGISTRATION_KEY`.

4. **Run**
   ```bash
   npm run dev     # nodemon
   # or
   npm start
   ```

## Roles & Permission Matrix

| Endpoint / Action | Customer | Pharmacist | Admin |
|---|---|---|---|
| `POST /api/auth/register` (customer signup) | ✅ | ❌ | ❌ |
| `POST /api/auth/register-staff` (needs admin key) | ❌ | ✅ | ✅ |
| `GET /api/medicines` (browse catalog) | ✅ | ✅ | ✅ |
| `POST /api/medicines` (add medicine) | ❌ | ✅ | ✅ |
| `PUT /api/medicines/:id` (update stock/price) | ❌ | ✅ | ✅ |
| `DELETE /api/medicines/:id` (remove drug) | ❌ | ❌ | ✅ |
| `POST /api/orders` (place order) | ✅ | ❌ | ❌ |
| `PATCH /api/orders/:id/status` (approve/reject) | ❌ | ✅ | ✅ |
| `GET /api/reports/expiring-soon` → `GET /api/medicines/expiring` | ❌ | ✅ | ✅ |

Staff accounts (`pharmacist`/`admin`) are created via `POST /api/auth/register-staff`, which requires both a `requestedRole` and the shared `ADMIN_REGISTRATION_KEY` from your `.env`.

## Endpoints

**Auth**
- `POST /api/auth/register` — public, always creates a `customer`
- `POST /api/auth/register-staff` — `{ name, email, password, requestedRole, adminKey }`, creates `pharmacist` or `admin`
- `POST /api/auth/login`
- `GET /api/auth/profile` — authenticated

**Medicines**
- `GET /api/medicines?search=&category=` — public
- `GET /api/medicines/expiring` — Pharmacist/Admin, returns medicines expiring within 30 days
- `GET /api/medicines/:id` — public
- `POST /api/medicines` — Pharmacist/Admin
- `PUT /api/medicines/:id` — Pharmacist/Admin
- `DELETE /api/medicines/:id` — Admin only

**Orders**
- `POST /api/orders` — Customer only. `{ items: [{ medicineId, quantity }], prescriptionNotes? }`. Validates stock availability and requires `prescriptionNotes` if any item `requiresPrescription`.
- `GET /api/orders/my-orders` — Customer only
- `GET /api/orders?status=` — Pharmacist/Admin
- `PATCH /api/orders/:id/status` — Pharmacist/Admin, `{ status }`. Transitioning to `approved` for the first time atomically decrements `stockQuantity` for every item.

## Key Design Notes

- **Atomic stock deduction on approval**: each item's stock decrement is a conditional `findOneAndUpdate` (`stockQuantity >= quantity`), so concurrent approval requests can never push stock negative. If any single item in a multi-item order can't be decremented at approval time, all prior decrements from that same request are rolled back and the whole approval fails — an order is never half-approved.
- **Prescription enforcement**: placing an order containing any `requiresPrescription: true` medicine requires non-empty `prescriptionNotes`.
- **Role hierarchy via middleware composition**: `authorizeRoles(...)` accepts any number of allowed roles, so routes like medicine creation can allow both `pharmacist` and `admin` while deletion is `admin`-only, without duplicating logic.
- Passwords are bcrypt-hashed (10 rounds) and never returned in API responses.

## Testing Checklist (from the assignment spec)

1. Create a customer, a pharmacist, and an admin user (staff via `/api/auth/register-staff` with the admin key).
2. Attempt `POST /api/medicines` with a customer JWT → expect `403 Forbidden`.
3. Add a medicine using the pharmacist token.
4. Place an order as the customer, then `PATCH /api/orders/:id/status` with `{ "status": "approved" }` as the pharmacist → confirm the medicine's `stockQuantity` decrements by the ordered amount.

## Project Structure

```
pharmacy-management-api/
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── medicineController.js
│   └── orderController.js
├── middleware/
│   ├── auth.js
│   └── roleGuard.js
├── models/
│   ├── Medicine.js
│   ├── Order.js
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   ├── medicineRoutes.js
│   └── orderRoutes.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```
