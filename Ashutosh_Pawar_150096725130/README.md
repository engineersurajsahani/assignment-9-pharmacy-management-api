# Pharmacy Management API

Assignment 9 - Ashutosh Pawar (150096725130)

REST API for a pharmacy with three roles: `customer`, `pharmacist` and `admin`.
Customers browse medicines and place orders. Pharmacists and admins manage the
inventory, approve orders and read the expiry and low stock reports. Only an
admin can delete a medicine. Login gives a JWT, and every protected route checks
the token first and then the role. Stock is taken off only when an order is
approved, inside a MongoDB transaction, so stock can never go below zero. A
plain HTML frontend in `public/` is served by the same server.

## Tech stack

- Node.js, Express 5
- MongoDB Atlas, Mongoose
- jsonwebtoken, bcryptjs
- dotenv, cors
- HTML + fetch + SweetAlert2 for the frontend

## Project structure

```text
Ashutosh_Pawar_150096725130/
├── config/
│   └── db.js                         # MongoDB Atlas connection
├── controllers/
│   ├── authController.js             # register, staff register, login, profile
│   ├── medicineController.js         # medicine CRUD, expiring and low stock aggregations
│   └── orderController.js            # order placing, status changes, stock deduction, summary
├── middleware/
│   ├── auth.js                       # verifyToken: checks the JWT and loads the user
│   └── roleGuard.js                  # authorizeRoles(...roles), isStaff, isAdmin, isCustomer
├── models/
│   ├── Medicine.js
│   ├── Order.js
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   ├── medicineRoutes.js
│   ├── orderRoutes.js
│   └── reportRoutes.js               # /api/reports/expiring-soon, low-stock, orders-summary
├── public/                           # frontend pages + app.js
├── pharmacy-api.postman_collection.json
├── test.http
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Setup

Needs Node.js 18+ and a MongoDB Atlas cluster. Order approval uses a
transaction, so the database must be a replica set. Every Atlas cluster
(including the free M0) already is one.

```bash
npm install
cp .env.example .env
npm run dev
```

- API: `http://localhost:3000/api/...`
- Frontend: `http://localhost:3000/index.html`

## Environment variables

| Variable         | Example                                          | Notes                                    |
| ---------------- | ------------------------------------------------ | ---------------------------------------- |
| `PORT`           | `3000`                                           | Server port                              |
| `MONGO_URI`      | `mongodb+srv://user:pass@cluster.mongodb.net/db` | Atlas connection string                  |
| `JWT_SECRET`     | long random string                               | Signs the tokens                         |
| `JWT_EXPIRES_IN` | `1d`                                             | Token lifetime, default `1d`             |
| `ADMIN_KEY`      | long random string                               | Needed to create pharmacist/admin users  |

## Data models

### User

| Field      | Type   | Notes                                              |
| ---------- | ------ | -------------------------------------------------- |
| `name`     | String | required                                           |
| `email`    | String | required, unique, stored lowercase                 |
| `password` | String | bcrypt hash, never returned by the API             |
| `phone`    | String | optional                                           |
| `role`     | String | `customer` (default), `pharmacist`, `admin`        |

### Medicine

| Field                  | Type    | Notes                                         |
| ---------------------- | ------- | --------------------------------------------- |
| `name`                 | String  | required                                      |
| `brand`                | String  | required                                      |
| `category`             | String  | required, e.g. Antibiotic, Analgesic          |
| `dosageForm`           | String  | `Tablet`, `Capsule`, `Syrup`, `Injection`     |
| `price`                | Number  | required, min 0                               |
| `stockQuantity`        | Number  | required, whole number, min 0                 |
| `requiresPrescription` | Boolean | default `false`                               |
| `expiryDate`           | Date    | required, must be in the future when added    |
| `isExpired`            | virtual | `true` once `expiryDate` has passed           |

`name + brand + dosageForm` is unique. `expiryDate` and `category` are indexed.

### Order

| Field                  | Type     | Notes                                                        |
| ---------------------- | -------- | ------------------------------------------------------------ |
| `customer`             | ObjectId | ref `User`                                                   |
| `items`                | Array    | `{ medicine, name, quantity, unitPrice, requiresPrescription }` |
| `totalAmount`          | Number   | worked out on the server from current prices                 |
| `prescriptionNotes`    | String   | required when any item needs a prescription                  |
| `prescriptionVerified` | Boolean  | set to `true` when a pharmacist approves an Rx order         |
| `status`               | String   | `pending`, `approved`, `dispensed`, `cancelled`              |
| `handledBy`            | ObjectId | staff member who last changed the status                     |
| `statusHistory`        | Array    | `{ status, by, at }` for every change                        |

The item `name` and `unitPrice` are copied into the order, so later price
changes do not change old orders.

## Authentication and roles

Login returns a token. Send it on every protected request:

```
Authorization: Bearer <token>
```

`verifyToken` checks the signature and expiry, then loads the user from the
database, so a deleted user's token stops working at once. `authorizeRoles`
then checks `request.user.role` against the roles allowed on that route.

| Situation                    | Response                                  |
| ---------------------------- | ----------------------------------------- |
| No token                     | `401 No token provided!`                  |
| Bad or tampered token        | `401 Invalid token!`                      |
| Expired token                | `401 Token expired, please login again!`  |
| User deleted after login     | `401 User no longer exists!`              |
| Logged in but wrong role     | `403 Forbidden: only ... can do this!`    |

Customers sign up through `/api/auth/register`. Pharmacist and admin accounts
come from `/api/auth/register-staff` and need the `ADMIN_KEY` from `.env`, so
nobody can make themselves staff.

### Permission matrix

| Action                              | Customer | Pharmacist | Admin |
| ----------------------------------- | :------: | :--------: | :---: |
| Browse medicines                    |   yes    |    yes     |  yes  |
| Add / update medicine               |    no    |    yes     |  yes  |
| Delete medicine                     |    no    |     no     |  yes  |
| Place order, view / cancel own      |   yes    |     no     |  no   |
| View all orders, change status      |    no    |    yes     |  yes  |
| Expiring, low stock, order reports  |    no    |    yes     |  yes  |

## Endpoints

### Auth

| Method | Route                      | Token    | Description                                       |
| ------ | -------------------------- | -------- | ------------------------------------------------- |
| POST   | `/api/auth/register`       | none     | Register a customer                               |
| POST   | `/api/auth/register-staff` | none     | Register a pharmacist or admin (needs `adminKey`) |
| POST   | `/api/auth/login`          | none     | Login, returns `token` and `user`                 |
| GET    | `/api/auth/profile`        | any role | Current user                                      |

Staff register body: `{ name, email, password, role: "pharmacist" | "admin", adminKey }`

### Medicines

| Method | Route                        | Token       | Description                                   |
| ------ | ---------------------------- | ----------- | --------------------------------------------- |
| GET    | `/api/medicines`             | none        | List with search and filters                  |
| GET    | `/api/medicines/categories`  | none        | Distinct categories                           |
| GET    | `/api/medicines/:id`         | none        | One medicine                                  |
| GET    | `/api/medicines/expiring`    | staff       | Expiring within `?days=` (default 30)         |
| GET    | `/api/medicines/low-stock`   | staff       | Stock at or below `?threshold=` (default 10)  |
| POST   | `/api/medicines`             | staff       | Add medicine                                  |
| PUT    | `/api/medicines/:id`         | staff       | Update stock, price or any other field        |
| DELETE | `/api/medicines/:id`         | admin       | Delete medicine                               |

`GET /api/medicines` query options:

- `search` matches part of the name, brand or category, case-insensitive
- `category` exact category, case-insensitive
- `dosageForm`, `requiresPrescription=true|false`
- `includeExpired=true` also lists expired stock (hidden by default)

A medicine that is in a `pending` or `approved` order cannot be deleted (`409`).

### Orders

| Method | Route                     | Token    | Description                                        |
| ------ | ------------------------- | -------- | -------------------------------------------------- |
| POST   | `/api/orders`             | customer | Place an order                                     |
| GET    | `/api/orders/my-orders`   | customer | Own order history                                  |
| PATCH  | `/api/orders/:id/cancel`  | customer | Cancel own order while it is still pending         |
| GET    | `/api/orders`             | staff    | All orders, `?status=` filter                      |
| GET    | `/api/orders/:id`         | any role | One order (customers only see their own)           |
| PATCH  | `/api/orders/:id/status`  | staff    | `approved`, `dispensed` or `cancelled`             |

Place order body:

```json
{
  "items": [{ "medicine": "<medicineId>", "quantity": 2 }],
  "prescriptionNotes": "Dr. Sharma, 24 Sep 2026"
}
```

Status body: `{ "status": "approved", "prescriptionVerified": true }`

### Reports

| Method | Route                          | Token | Description                                      |
| ------ | ------------------------------ | ----- | ------------------------------------------------ |
| GET    | `/api/reports/expiring-soon`   | staff | Same as `/medicines/expiring`                    |
| GET    | `/api/reports/low-stock`       | staff | Same as `/medicines/low-stock`                   |
| GET    | `/api/reports/orders-summary`  | staff | Orders and amount per status, top 5 medicines    |

## How it works

- **Placing an order.** Duplicate lines for the same medicine are merged. Each
  medicine must exist, not be expired, and have enough stock. Prices come from
  the database, never from the request. If any item needs a prescription,
  `prescriptionNotes` is required.
- **Order lifecycle.**

  ```
  pending  -> approved | cancelled
  approved -> dispensed | cancelled
  dispensed, cancelled -> final
  ```

  Any other move returns `400`.
- **Stock deduction.** Approving runs inside `mongoose.connection.transaction`.
  For each item it runs
  `updateOne({ _id, stockQuantity: { $gte: qty }, expiryDate: { $gt: now } }, { $inc: { stockQuantity: -qty } })`.
  If any item fails, the whole transaction is rolled back, no stock changes and
  the order stays `pending` (`409 Not enough stock for ...`). Two pharmacists
  approving at the same moment cannot both win, because both write the same
  order inside a transaction and one of them is retried and then sees it is no
  longer pending. Cancelling an approved order puts the stock back the same way.
- **Prescription check.** An order with an Rx item can only be approved with
  `prescriptionVerified: true`. The frontend asks the pharmacist to confirm
  after showing the notes.
- **Expiring report.** One aggregation: `$match` on the date window,
  `$addFields` for `daysLeft` (`$dateDiff`) and `stockValue`, then `$facet` for
  the list and a summary (count, total units, stock value at risk).
  `includeExpired=true` also returns items already past their date.
- **Low stock report.** `$match` on `stockQuantity <= threshold`, grouped by
  category.
- **Orders summary.** `$group` by status, and `$unwind` over items of approved
  and dispensed orders for the top 5 medicines by units sold.

## Status codes

| Code | When                                                        |
| ---- | ----------------------------------------------------------- |
| 200  | Success                                                     |
| 201  | User, medicine or order created                             |
| 400  | Missing or invalid fields, bad status change, bad JSON      |
| 401  | No token, bad token, expired token, wrong login             |
| 403  | Wrong role, wrong admin key                                 |
| 404  | Medicine, order or route not found                          |
| 409  | Email taken, duplicate medicine, not enough stock, medicine in open orders |
| 500  | Unexpected server error                                     |

## Testing

- `pharmacy-api.postman_collection.json`: import into Postman and run top to
  bottom. The login requests save `customerToken`, `pharmacistToken` and
  `adminToken`, and later requests use the right one, including the `403` cases.
  Set the `adminKey` collection variable to your `ADMIN_KEY`.
- `test.http`: the same requests for the VS Code REST Client.

Verification steps from the assignment:

1. Register a customer, then a pharmacist and an admin through `register-staff`.
2. Add a medicine with the customer token, the response is `403`.
3. Add the medicine with the pharmacist token, the response is `201`.
4. Place an order as the customer, approve it as the pharmacist, then
   `GET /api/medicines/:id` shows `stockQuantity` lowered by the ordered amount.

Frontend: open `http://localhost:3000/index.html`. Customers get a cart and
their order history. Staff get Add Medicine, Orders (approve, dispense, cancel)
and Reports.
