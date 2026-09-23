# 💊 Pharmacy & Healthcare Store API — with RBAC & JWT

> **Assignment 09 · Backend Development (Intermediate)**  
> **Student:** Daksh Ghandat · **Roll No:** 209  
> **Stack:** Node.js · Express.js · MongoDB Atlas · Mongoose · JWT · bcryptjs · dotenv · cors

A production-style **Pharmacy Management & Medicine Ordering REST API**. It implements
role-based access control across three user tiers (**Customer**, **Pharmacist**, **Admin**),
prescription-aware ordering, expiring `/` low-stock inventory reports, and **atomic
stock deduction** when a pharmacist/admin approves an order.

Security features:

- Passwords hashed with **bcrypt** — never stored or returned in plain text.
- **JWT** auth middleware with a role guard (`authorizeRoles(...)`) → `403` when a role is not allowed.
- `self-registration can never create staff accounts` — customers are always created as `customer`; staff need the `ADMIN_KEY`.
- **Server-side pricing** — `unitPrice` and `totalAmount` come from the DB, never from the client.
- **Atomic stock updates** on approval using MongoDB transactions + conditional `$inc` (no double-deduction, no negative stock).

---

## 📁 Folder Structure

```text
Daksh Ghandat - 209 - Pharmacy & Healthcare Store API/
│
├── config/
│   └── db.js                   # MongoDB Atlas connection
│
├── controllers/
│   ├── authController.js       # register / register-staff / login / profile
│   ├── medicineController.js   # medicine CRUD + expiring query
│   ├── orderController.js      # orders + status workflow + stock deduction
│   └── reportController.js     # expiring-soon + low-stock reports
│
├── middleware/
│   ├── auth.js                 # JWT verification (protect)
│   └── roleGuard.js            # authorizeRoles('admin', 'pharmacist', ...)
│
├── models/
│   ├── User.js
│   ├── Medicine.js
│   └── Order.js
│
├── routes/
│   ├── authRoutes.js
│   ├── medicineRoutes.js
│   ├── orderRoutes.js
│   └── reportRoutes.js
│
├── data/
│   ├── seedData.js             # sample users + medicines
│   └── seed.js                 # `node data/seed.js` -> loads sample data
│
├── Pharmacy-API.postman_collection.json   # ready-to-import Postman collection
├── ASSIGNMENT-SPEC.md          # original assignment specification
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then open `.env` and fill in:

| Variable    | Purpose                                                            |
| ----------- | ------------------------------------------------------------------ |
| `MONGO_URI` | Your MongoDB Atlas connection string, e.g. `mongodb+srv://...`      |
| `JWT_SECRET`| Long random secret used to sign JWTs                                |
| `ADMIN_KEY` | Shared secret required in `POST /api/auth/register-staff`           |
| `PORT`      | Server port (default `5055` — 5000 is often taken on macOS)         |

> ⚠️ Never commit `.env` — it is already listed in `.gitignore`.

### 3. Seed sample data (optional but recommended)

```bash
node data/seed.js
```

This inserts **6 medicines** (including an expiring antibiotic and low-stock items
so the reports return data) and **3 demo users** — all with password `password123`:

| Role        | Email                  |
| ----------- | ---------------------- |
| customer    | `customer@demo.com`    |
| pharmacist  | `pharmacist@demo.com`  |
| admin       | `admin@demo.com`       |

### 4. Start the server

```bash
npm run dev     # nodemon (auto-restart)
# or
npm start       # plain node
```

The API is now live at **http://localhost:5055**.

---

## 👥 Roles & Permission Matrix

| Action                          | Customer | Pharmacist | Admin |
| ------------------------------- | :------: | :--------: | :---: |
| `POST /api/auth/register`       |    ✅    |     ❌     |  ❌   |
| `POST /api/auth/register-staff` |    ❌    |  ✅ (key)  | ✅(key) |
| `GET /api/medicines`            |    ✅    |     ✅     |  ✅   |
| `POST /api/medicines`           |    ❌    |     ✅     |  ✅   |
| `PUT /api/medicines/:id`        |    ❌    |     ✅     |  ✅   |
| `DELETE /api/medicines/:id`     |    ❌    |     ❌     |  ✅   |
| `POST /api/orders`              |    ✅    |     ❌     |  ❌   |
| `GET /api/orders/my-orders`     |    ✅    |     ❌     |  ❌   |
| `GET /api/orders`               |    ❌    |     ✅     |  ✅   |
| `PATCH /api/orders/:id/status`  |    ❌    |     ✅     |  ✅   |
| `GET /api/medicines/expiring`   |    ❌    |     ✅     |  ✅   |
| `GET /api/reports/expiring-soon`|    ❌    |     ✅     |  ✅   |
| `GET /api/reports/low-stock`    |    ❌    |     ✅     |  ✅   |
| `GET /api/auth/profile`         |    ✅    |     ✅     |  ✅   |

---

## 📡 API Endpoints

### 🔐 Auth

| Method | Endpoint                  | Access | Body                                             |
| ------ | ------------------------- | ------ | ------------------------------------------------ |
| POST   | `/api/auth/register`      | Public | `{ name, email, password }`                      |
| POST   | `/api/auth/register-staff`| Key    | `{ name, email, password, role, adminKey }`      |
| POST   | `/api/auth/login`         | Public | `{ email, password }`  → returns `token`         |
| GET    | `/api/auth/profile`       | Auth   | —                                                |

### 💊 Medicines

| Method | Endpoint                  | Access         | Notes                               |
| ------ | ------------------------- | -------------- | ----------------------------------- |
| GET    | `/api/medicines`          | Public         | `?search=paracetamol` `?category=` |
| GET    | `/api/medicines/expiring` | Pharm/Admin    | Expiring in the next 30 days        |
| POST   | `/api/medicines`          | Pharm/Admin    | Add medicine                        |
| PUT    | `/api/medicines/:id`      | Pharm/Admin    | Update price / stock / fields       |
| DELETE | `/api/medicines/:id`      | Admin          | Delete medicine                     |

### 📦 Orders

| Method | Endpoint                  | Access      | Notes                                    |
| ------ | ------------------------- | ----------- | ---------------------------------------- |
| POST   | `/api/orders`             | Customer    | Place order (prescription checked)       |
| GET    | `/api/orders/my-orders`   | Customer    | Customer's own order history             |
| GET    | `/api/orders`             | Pharm/Admin | All orders, `?status=pending|approved|…` |
| PATCH  | `/api/orders/:id/status`  | Pharm/Admin | `approved` / `dispensed` / `cancelled`   |

Allowed status flow: `pending → approved → dispensed`, `pending → cancelled`.
Approving deducts stock atomically; anything else rolls back safely.

### 📊 Reports

| Method | Endpoint                     | Access      | Notes                         |
| ------ | ---------------------------- | ----------- | ----------------------------- |
| GET    | `/api/reports/expiring-soon` | Pharm/Admin | Expiring in the next 30 days  |
| GET    | `/api/reports/low-stock`     | Pharm/Admin | `?threshold=10` (default 10)  |

---

## 🧪 How to Test (Postman / curl)

1. **Login** as any seeded user → copy the returned `token`.
2. Add an `Authorization: Bearer <token>` header to protected requests.
3. Import `Pharmacy-API.postman_collection.json` into Postman for a complete
   collection covering all three roles (customer / pharmacist / admin).

### Quick smoke test (proves the key business rule — stock deduction)

```bash
# 1. Customer registers + logs in
curl -X POST http://localhost:5055/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@demo.com","password":"password123"}'

TOKEN=$(curl -s -X POST http://localhost:5055/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@demo.com","password":"password123"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# 2. Customer tries to add a medicine -> 403 (RBAC works)
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://localhost:5055/api/medicines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hack","brand":"H","category":"C","dosageForm":"Tablet","price":10,"stockQuantity":10,"expiryDate":"2027-12-31"}'
# -> 403
```

### Positive path (using seeded data)

With a **pharmacist** token and a **customer** token:

1. Pharmacist creates a medicine (`stockQuantity: 100`).
2. Customer places an order for `quantity: 5` → order `pending`, stock still `100`.
3. Pharmacist approves → order `approved`, **stock becomes `95`**.
4. Approving again → `400`, stock stays `95` (no double-deduction).
5. Admin dispenses → `dispensed`.
6. `GET /api/reports/expiring-soon` and `GET /api/reports/low-stock` return the seeded items.

---

## 🔀 Better on MongoDB Atlas

This API uses **MongoDB transactions** in the order-approval path, which require a
**replica set**. MongoDB Atlas (free M0 tier included) provides this automatically —
just paste your Atlas connection string into `MONGO_URI`.

If you run against a plain local `mongod` (standalone) you can start one as a
single-node replica set:

```bash
mongod --replSet rs0 ...
mongosh --eval "rs.initiate()"
```

---

## ❓ Common Issues

| Issue                                              | Fix                                                        |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `Could not connect to any servers...` from Atlas   | Add your current public IP (or `0.0.0.0/0`) in Atlas → Network Access |
| Port 5000 already in use on macOS                  | macOS AirPlay/ControlCenter owns 5000 — use `PORT=5055`    |
| `Transaction numbers are only allowed on a replica set` | Point `MONGO_URI` at Atlas, or run mongod with `--replSet` |