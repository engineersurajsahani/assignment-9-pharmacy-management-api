# 💊 Pharmacy & Healthcare Store REST API

A production-quality RESTful API for a modern Pharmacy and Healthcare Store management system, featuring **JWT-based Role-Based Access Control (RBAC)**, atomic inventory updates, prescription verification, order management, and MongoDB Atlas persistence.

---

## 📑 Table of Contents
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
- [Key Features & Business Logic](#-key-features--business-logic)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Step-by-Step Testing Walkthrough](#-step-by-step-testing-walkthrough)
- [Concurrency & Stock Deduction Architecture](#-concurrency--stock-deduction-architecture)
- [Postman Collection](#-postman-collection)

---

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database & ODM**: MongoDB Atlas & Mongoose
- **Authentication & Security**: JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`), Cross-Origin Resource Sharing (`cors`)
- **Environment Management**: `dotenv`
- **Development Tooling**: `nodemon`

---

## 📂 Folder Structure

```text
assignment-09-pharmacy-api/
├── config/
│   └── db.js                 # MongoDB connection handler
├── controllers/
│   ├── authController.js     # User registration, staff onboarding, login, profile
│   ├── medicineController.js # Medicine CRUD, search, category filters, expiry reports
│   └── orderController.js    # Order lifecycle, stock checks, state machine & atomic approval
├── middleware/
│   ├── auth.js               # JWT extraction, token verification, req.user attachment
│   └── roleGuard.js          # authorizeRoles(...roles) RBAC middleware
├── models/
│   ├── Medicine.js           # Medicine catalog schema with validation & indexing
│   ├── Order.js              # Order schema with items, status enums & timestamps
│   └── User.js               # User schema with bcrypt pre-save hook & role enums
├── routes/
│   ├── authRoutes.js         # /api/auth routes
│   ├── medicineRoutes.js     # /api/medicines routes
│   ├── orderRoutes.js        # /api/orders routes
│   └── reportRoutes.js       # /api/reports routes
├── .env.example              # Template for environment variables
├── .gitignore                # Ignored directories & files (node_modules, .env)
├── package.json              # Project dependencies & scripts
├── postman_collection.json   # Ready-to-import Postman collection (v2.1)
├── server.js                 # Express server configuration & route mounting
└── README.md                 # Complete documentation
```

---

## 🛡 Role-Based Access Control (RBAC) Matrix

| Method | Endpoint | Description | Public | Customer | Pharmacist | Admin |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `POST` | `/api/auth/register` | Register regular customer | ✅ | ❌ | ❌ | ❌ |
| `POST` | `/api/auth/register-staff` | Register staff with admin secret key | ❌ | ❌ | ✅ | ✅ |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | ✅ | ✅ | ✅ | ✅ |
| `GET` | `/api/auth/profile` | View authenticated user profile | ❌ | ✅ | ✅ | ✅ |
| `GET` | `/api/medicines` | Browse & search medicines | ✅ | ✅ | ✅ | ✅ |
| `GET` | `/api/medicines/:id` | View single medicine details | ✅ | ✅ | ✅ | ✅ |
| `GET` | `/api/medicines/expiring` | Expiring medicines report (< 30 days) | ❌ | ❌ | ✅ | ✅ |
| `GET` | `/api/reports/expiring-soon` | Expiring report alias | ❌ | ❌ | ✅ | ✅ |
| `POST` | `/api/medicines` | Add a new medicine | ❌ | ❌ | ✅ | ✅ |
| `PUT` | `/api/medicines/:id` | Update medicine stock / price / details | ❌ | ❌ | ✅ | ✅ |
| `DELETE`| `/api/medicines/:id` | Delete a medicine | ❌ | ❌ | ❌ | ✅ |
| `POST` | `/api/orders` | Place new order | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/api/orders/my-orders` | View own customer orders | ❌ | ✅ | ❌ | ❌ |
| `GET` | `/api/orders` | View all customer orders (filter by `?status=`) | ❌ | ❌ | ✅ | ✅ |
| `GET` | `/api/orders/:id` | View specific order | ❌ | Own | ✅ | ✅ |
| `PATCH` | `/api/orders/:id/status` | Update order status (approve / dispense / cancel) | ❌ | ❌ | ✅ | ✅ |

---

## ⚙ Key Features & Business Logic

1. **Secure Customer Registration (`POST /api/auth/register`)**:
   - Any user can register publicly.
   - The user role is strictly locked to `'customer'` in the database regardless of any `role` value sent in the payload.
2. **Protected Staff Onboarding (`POST /api/auth/register-staff`)**:
   - Requires a secret key (`adminSecretKey`) matching `process.env.ADMIN_REGISTER_KEY`.
   - Role must be `'pharmacist'` or `'admin'`.
   - Unauthorized attempts return `403 Forbidden`.
3. **Composable RBAC Middleware (`middleware/roleGuard.js`)**:
   - Composes seamlessly with `auth.js`:
     ```javascript
     router.post('/', auth, authorizeRoles('pharmacist', 'admin'), createMedicine);
     router.delete('/:id', auth, authorizeRoles('admin'), deleteMedicine);
     ```
4. **Order Placement Rules (`POST /api/orders`)**:
   - Available only to customers.
   - Verifies stock availability (`stockQuantity >= requested quantity`).
   - If any item in the order is flagged `requiresPrescription: true`, the customer **must** provide non-empty `prescriptionNotes`.
   - Unit prices and `totalAmount` are calculated server-side to prevent client-side price tampering.
   - Initial status is saved as `'pending'` (inventory is not decremented yet).
5. **Atomic Order Approval & Stock Deduction (`PATCH /api/orders/:id/status`)**:
   - Strict state transitions:
     - `pending` ➔ `approved` (Atomically decrements stock)
     - `pending` ➔ `cancelled`
     - `approved` ➔ `dispensed` (Stock already decremented; no double deductions)
     - `approved` ➔ `cancelled` (Restores previously decremented stock)
     - `dispensed` or `cancelled` are terminal states.
   - Atomic decrement prevents race conditions across concurrent orders. If any item runs out of stock before approval, the update aborts, all modifications rollback, and a `400 Bad Request` is returned with the exact item name.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16.x or higher)
- npm (v8.x or higher)
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or local MongoDB)

### 1. Clone & Install Dependencies
```bash
git clone <repository_url>
cd assignment-09-pharmacy-api
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your connection details:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/pharmacy_db?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_here_change_in_prod
JWT_EXPIRES_IN=1d
ADMIN_REGISTER_KEY=change_this_admin_key
```

> **How to get a MongoDB Atlas Connection String**:
> 1. Sign in to MongoDB Atlas and create a free Shared Cluster.
> 2. Go to **Database Access** ➔ Create a database user with username and password.
> 3. Go to **Network Access** ➔ Click "Add IP Address" ➔ Add `0.0.0.0/0` (Allow access from anywhere).
> 4. Go to **Databases** ➔ Click **Connect** ➔ Choose **Connect your application (Drivers)**.
> 5. Copy the connection string into your `.env` file under `MONGO_URI` and replace `<password>` with your database user password.

### 3. Run the Application
- **Development Mode** (with hot reload):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

---

## 📖 API Endpoints Reference

### 1. Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "John Customer",
    "email": "customer@example.com",
    "password": "Customer123!",
    "phone": "+1-555-0199"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Customer registered successfully",
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "67ce19...",
        "name": "John Customer",
        "email": "customer@example.com",
        "role": "customer"
      }
    }
  }
  ```

#### `POST /api/auth/register-staff`
- **Access**: Admin Key Required
- **Request Body**:
  ```json
  {
    "name": "Dr. Sarah",
    "email": "sarah@pharmastore.com",
    "password": "Pharm123!",
    "phone": "+1-555-0144",
    "role": "pharmacist",
    "adminSecretKey": "change_this_admin_key"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Staff member (pharmacist) registered successfully",
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "67ce1a...",
        "name": "Dr. Sarah",
        "email": "sarah@pharmastore.com",
        "role": "pharmacist"
      }
    }
  }
  ```

#### `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "Customer123!"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "67ce19...",
        "name": "John Customer",
        "email": "customer@example.com",
        "role": "customer"
      }
    }
  }
  ```

---

### 2. Medicines Endpoints (`/api/medicines`)

#### `GET /api/medicines`
- **Access**: Public
- **Query Parameters**: `search`, `category`, `page`, `limit`, `sort`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "total": 1,
      "page": 1,
      "totalPages": 1,
      "count": 1,
      "medicines": [
        {
          "_id": "67ce1b...",
          "name": "Amoxicillin 500mg",
          "brand": "Pfizer",
          "category": "Antibiotic",
          "dosageForm": "Capsule",
          "price": 18.5,
          "stockQuantity": 100,
          "requiresPrescription": true,
          "expiryDate": "2027-11-30T00:00:00.000Z"
        }
      ]
    }
  }
  ```

#### `POST /api/medicines`
- **Access**: Pharmacist, Admin
- **Headers**: `Authorization: Bearer <pharmacist_or_admin_jwt>`
- **Request Body**:
  ```json
  {
    "name": "Amoxicillin 500mg",
    "brand": "Pfizer",
    "category": "Antibiotic",
    "dosageForm": "Capsule",
    "price": 18.50,
    "stockQuantity": 100,
    "requiresPrescription": true,
    "expiryDate": "2027-11-30T00:00:00.000Z"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Medicine created successfully",
    "data": {
      "_id": "67ce1b...",
      "name": "Amoxicillin 500mg",
      "brand": "Pfizer",
      "category": "Antibiotic",
      "dosageForm": "Capsule",
      "price": 18.5,
      "stockQuantity": 100,
      "requiresPrescription": true,
      "expiryDate": "2027-11-30T00:00:00.000Z"
    }
  }
  ```

#### `GET /api/medicines/expiring` (or `/api/reports/expiring-soon`)
- **Access**: Pharmacist, Admin
- **Headers**: `Authorization: Bearer <token>`
- **Response (`200 OK`)**: Lists all medicines expiring in the upcoming 30 days.

#### `DELETE /api/medicines/:id`
- **Access**: Admin Only
- **Headers**: `Authorization: Bearer <admin_jwt>`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Medicine 'Paracetamol 650mg' (ID: 67ce1c...) was successfully deleted",
    "data": { "id": "67ce1c...", "name": "Paracetamol 650mg" }
  }
  ```

---

### 3. Orders Endpoints (`/api/orders`)

#### `POST /api/orders`
- **Access**: Customer Only
- **Headers**: `Authorization: Bearer <customer_jwt>`
- **Request Body**:
  ```json
  {
    "items": [
      {
        "medicineId": "67ce1b...",
        "quantity": 2
      }
    ],
    "prescriptionNotes": "Prescribed by Dr. Adams: 1 capsule every 8 hours"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Order placed successfully with status pending",
    "data": {
      "_id": "67ce1d...",
      "customer": "67ce19...",
      "items": [
        {
          "medicine": {
            "_id": "67ce1b...",
            "name": "Amoxicillin 500mg",
            "price": 18.5
          },
          "quantity": 2,
          "unitPrice": 18.5
        }
      ],
      "totalAmount": 37.0,
      "prescriptionNotes": "Prescribed by Dr. Adams: 1 capsule every 8 hours",
      "status": "pending"
    }
  }
  ```

#### `PATCH /api/orders/:id/status`
- **Access**: Pharmacist, Admin
- **Headers**: `Authorization: Bearer <staff_jwt>`
- **Request Body**:
  ```json
  {
    "status": "approved"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Order status successfully transitioned from 'pending' to 'approved'",
    "data": {
      "_id": "67ce1d...",
      "status": "approved"
    }
  }
  ```

---

## 🧪 Step-by-Step Testing Walkthrough

### Step 1: Create Customer, Pharmacist, and Admin Accounts
1. **Customer**: `POST /api/auth/register`
   - Body: `{ "name": "John", "email": "customer@example.com", "password": "Password123!" }`
   - Role is automatically assigned as `'customer'`. Save the returned token as `customerToken`.
2. **Pharmacist**: `POST /api/auth/register-staff`
   - Body: `{ "name": "Sarah", "email": "sarah@pharmastore.com", "password": "Password123!", "role": "pharmacist", "adminSecretKey": "change_this_admin_key" }`
   - Save the returned token as `pharmacistToken`.
3. **Admin**: `POST /api/auth/register-staff`
   - Body: `{ "name": "Admin", "email": "admin@pharmastore.com", "password": "Password123!", "role": "admin", "adminSecretKey": "change_this_admin_key" }`
   - Save the returned token as `adminToken`.

---

### Step 2: Try Adding a Medicine with Customer Token ➔ Expect 403 Forbidden
- **Request**: `POST /api/medicines`
- **Header**: `Authorization: Bearer <customerToken>`
- **Result**:
  ```json
  {
    "success": false,
    "message": "Forbidden: insufficient permissions. Allowed role(s): [pharmacist, admin]. Current role: 'customer'"
  }
  ```
- Status Code: **`403 Forbidden`** ✅

---

### Step 3: Add a Medicine with Pharmacist Token ➔ Expect 201 Created
- **Request**: `POST /api/medicines`
- **Header**: `Authorization: Bearer <pharmacistToken>`
- **Body**:
  ```json
  {
    "name": "Amoxicillin 500mg",
    "brand": "Pfizer",
    "category": "Antibiotic",
    "dosageForm": "Capsule",
    "price": 20,
    "stockQuantity": 50,
    "requiresPrescription": true,
    "expiryDate": "2027-12-31"
  }
  ```
- Status Code: **`201 Created`** ✅
- Save the returned medicine `_id`.

---

### Step 4: Place Order as Customer ➔ Approve as Pharmacist ➔ Verify Stock Deduction
1. **Place Order**:
   - `POST /api/orders` with `customerToken`
   - Body: `{ "items": [{ "medicineId": "<medicine_id>", "quantity": 5 }], "prescriptionNotes": "Valid Rx Notes" }`
   - Status Code: **`201 Created`**. Order status is `'pending'`.
   - Medicine `stockQuantity` in DB remains **50**.
2. **Approve Order**:
   - `PATCH /api/orders/<order_id>/status` with `pharmacistToken`
   - Body: `{ "status": "approved" }`
   - Status Code: **`200 OK`**. Order status transitions to `'approved'`.
3. **Verify Database Inventory**:
   - Query `GET /api/medicines/<medicine_id>`.
   - The `stockQuantity` has decremented from **50 ➔ 45** atomically! ✅

---

## ⚡ Concurrency & Stock Deduction Architecture

The API employs **Guarded Atomic Updates** (`findOneAndUpdate`) to guarantee inventory consistency:
```javascript
const updatedMed = await Medicine.findOneAndUpdate(
  {
    _id: item.medicine,
    stockQuantity: { $gte: item.quantity } // Guard condition prevents overselling
  },
  {
    $inc: { stockQuantity: -item.quantity } // Atomic decrement
  },
  { new: true }
);
```
- **No Race Conditions**: Multiple simultaneous orders cannot oversell remaining stock.
- **Automatic Rollback**: If an order contains multiple items and any item fails during approval, all previously decremented items in that order are immediately compensated (`$inc: +quantity`), preserving full inventory integrity without requiring complex replica set transaction setups.

---

## 📮 Postman Collection

The file [postman_collection.json](postman_collection.json) is pre-configured and ready to import into Postman:

1. Open Postman ➔ Click **Import** ➔ Select `postman_collection.json`.
2. The collection contains 3 organized folders:
   - **1. Customer Flow**: Registration, login, profile check, medicine search, order creation, order viewing, and 403 authorization test cases.
   - **2. Pharmacist Flow**: Staff registration, medicine CRUD, expiry reports, order viewing, order approval (atomic stock reduction), dispensing, and 403 test cases.
   - **3. Admin Flow**: Admin registration, creating medicines, deleting medicines, and viewing all system orders.
3. Test scripts automatically capture and store tokens (`customerToken`, `pharmacistToken`, `adminToken`), `medicineId`, and `orderId` in collection variables for seamless end-to-end execution.

---

## 📄 License
ISC License. Built for Production and Educational Demonstration.
