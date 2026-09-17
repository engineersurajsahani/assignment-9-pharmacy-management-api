# 💊 Pharmacy & Healthcare Store API — Assignment 09

A production-style **Pharmacy Management & Medicine Ordering REST API** built with **Node.js, Express, MongoDB Atlas, Mongoose, JWT** and **bcryptjs**, implementing strict **Role-Based Access Control (RBAC)** across three user tiers: `Admin`, `Pharmacist`, and `Customer`.

### Live Link 
https://full-stack-dev-4.onrender.com

---

## ✨ Key Features

- **JWT Authentication** with hashed passwords (bcryptjs) and role-encoded tokens.
- **RBAC permission hierarchy** enforced via reusable `protect` + `authorizeRoles` middleware.
- **Multi-role workflows**: customers order, pharmacists manage inventory & approve orders, admins own destructive operations.
- **Medicine inventory** with search, category filters, expiring-soon (30-day) alerts, and low-stock aggregation reports.
- **Order lifecycle**: `pending → approved → dispensed` (or `cancelled`), with **atomic stock deduction** when an order is approved.
- **Prescription enforcement**: prescription-only medicines require `prescriptionNotes` before an order can be placed.
- Clean **MVC layering**: `config/`, `controllers/`, `middleware/`, `models/`, `routes/`.
- Centralised **error handling** — no uncaught promise rejections.

---

## 🧩 Role-Based Permission Matrix

| Endpoint / Action | Customer | Pharmacist | Admin |
|---|:---:|:---:|:---:|
| `POST /api/auth/register` | ✅ | ❌ | ❌ |
| `POST /api/auth/register-staff` (admin key) | ❌ | ✅ | ✅ |
| `GET /api/medicines` | ✅ | ✅ | ✅ |
| `POST /api/medicines` | ❌ | ✅ | ✅ |
| `PUT /api/medicines/:id` | ❌ | ✅ | ✅ |
| `DELETE /api/medicines/:id` | ❌ | ❌ | ✅ |
| `GET /api/medicines/expiring` | ❌ | ✅ | ✅ |
| `GET /api/medicines/low-stock` | ❌ | ✅ | ✅ |
| `POST /api/orders` | ✅ | ❌ | ❌ |
| `GET /api/orders/my-orders` | ✅ | ❌ | ❌ |
| `GET /api/orders` | ❌ | ✅ | ✅ |
| `PATCH /api/orders/:id/status` | ❌ | ✅ | ✅ |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** ≥ 18
- A **MongoDB Atlas** cluster (free tier is fine)

### 2. Install

```bash
npm install
```

### 3. Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=8080
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/pharmacy-api
JWT_SECRET=super_secret_change_me
JWT_EXPIRE=7d
ADMIN_KEY=pharmacy-admin-key-2024
```

> ⚠️ **Never commit your real `.env`** — it is git-ignored.

### 4. Run

```bash
npm run dev      # nodemon for development
npm start        # production start
```

> ⚠️ **Troubleshooting on macOS:** port `5000` is often occupied by AirPlay Receiver (which answers requests with an empty `403 Forbidden`). If that happens, set `PORT=8080` (or any other port) — the project defaults to `8080`.

Server starts on `http://localhost:8080`.

---

## 🔐 API Endpoints

### Auth (`/api/auth`)

| Method | Route | Access | Description |
|---|------|--------|---|
| `POST` | `/register` | Public | Create a **customer** account |
| `POST` | `/register-staff` | Admin key | Create `pharmacist` or `admin` (body must include `adminKey`) |
| `POST` | `/login` | Public | Login, receive `{ token, data }` |
| `GET` | `/profile` | Authenticated | Get the current user's profile |

**`register-staff` body:**
```json
{ "name": "Dr. A", "email": "a@ph.com", "password": "secret123", "role": "pharmacist", "adminKey": "pharmacy-admin-key-2024" }
```

### Medicines (`/api/medicines`)

| Method | Route | Access | Description |
|---|------|--------|---|
| `GET` | `/` | Public | List (query: `search`, `category`, `requiresPrescription`, `sortBy`) |
| `GET` | `/expiring` | Pharmacist / Admin | Expiring in next 30 days (query: `days`) |
| `GET` | `/low-stock` | Pharmacist / Admin | Low stock alert (query: `threshold`, default 10) |
| `POST` | `/` | Pharmacist / Admin | Add a medicine |
| `PUT` | `/:id` | Pharmacist / Admin | Update price / stock / details |
| `DELETE` | `/:id` | Admin only | Remove a medicine |

**Example add-medicine body:**
```json
{
  "name": "Amoxicillin",
  "brand": "Cipla",
  "category": "Antibiotic",
  "dosageForm": "Capsule",
  "price": 180,
  "stockQuantity": 120,
  "requiresPrescription": true,
  "expiryDate": "2027-08-15"
}
```

### Orders (`/api/orders`)

| Method | Route | Access | Description |
|---|------|--------|---|
| `POST` | `/` | Customer | Place an order (snapshots unit price; validates stock) |
| `GET` | `/my-orders` | Customer | Own order history |
| `GET` | `/` | Pharmacist / Admin | All orders (query: `status`) |
| `PATCH` | `/:id/status` | Pharmacist / Admin | Approve / dispense / cancel |

**Example order body:**
```json
{
  "items": [{ "medicine": "<medicineId>", "quantity": 2 }],
  "prescriptionNotes": "Prescription #1234 — Dr. Fernandes"
}
```

> On `PATCH /:id/status` with `"status": "approved"`, every item's `stockQuantity` is **atomically decremented** via a conditional `findOneAndUpdate` (`stockQuantity >= quantity`), so overselling is impossible. Approving a `cancelled`/`dispensed` order is blocked by a transition guard.

---

## 📁 Project Structure

```text
├── config/
│   └── db.js                  # MongoDB Atlas connection
├── controllers/
│   ├── authController.js      # register / register-staff / login / profile
│   ├── medicineController.js  # CRUD + expiring & low-stock queries
│   └── orderController.js     # order lifecycle + atomic stock deduction
├── middleware/
│   ├── auth.js                # JWT verification (protect)
│   ├── roleGuard.js           # authorizeRoles('pharmacist', 'admin')
│   └── errorHandler.js        # 404 + centralised error responses
├── models/
│   ├── User.js                # hashed passwords, roles, JWT method
│   ├── Medicine.js            # inventory schema
│   └── Order.js               # nested item subdocuments + status enum
├── routes/
│   ├── authRoutes.js
│   ├── medicineRoutes.js
│   └── orderRoutes.js
├── utils/
│   └── errors.js              # AppError + asyncHandler
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## 🧪 Manual Testing Checklist

1. **Create the three accounts**
   - `POST /api/auth/register` → customer.
   - `POST /api/auth/register-staff` (with `adminKey`) → pharmacist and admin.
2. **Confirm customer is forbidden** from writing inventory (`POST /api/medicines` → `403`).
3. **Add a medicine** with the pharmacist token (`201`).
4. **Add an order** as the customer, then **approve** it as the pharmacist.
5. **Verify** the medicine's `stockQuantity` decreased by the ordered quantity (`GET /api/medicines`).

> A ready-to-import **Postman collection** demonstrating all three roles is expected for submission.

---

## 📤 Submission

- Repository name: **`itm-assignment-09-pharmacy-api`**
- Include the **Postman collection** with tokens saved as variables per role.