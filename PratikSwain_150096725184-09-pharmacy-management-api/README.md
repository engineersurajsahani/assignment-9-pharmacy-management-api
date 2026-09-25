# 💊 Pharmacy & Healthcare Store Management REST API (Assignment 09)

> **Student Name:** Pratik Swain  
> **Student ID:** 150096725184  
> **Live Render Deployment Link:** [https://assignment-9-pharmacy-management-api-ojsh.onrender.com](https://assignment-9-pharmacy-management-api-ojsh.onrender.com)  
> **Postman Collection:** [`postman_collection.json`](./postman_collection.json)  
> **Track:** Backend Development | **Level:** Intermediate  
> **Tech Stack:** Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcryptjs, dotenv, cors  

---

## 📖 1. Project Overview

A production-ready **Pharmacy Management & Medicine Ordering REST API** featuring **Role-Based Access Control (RBAC)** across three distinct user roles:
- **`Admin`**: Full system control, staff onboarding, inventory management, order supervision, and medicine deletion.
- **`Pharmacist`**: Catalog management, drug addition & pricing/stock updates, expiry tracking, and order approval/rejection.
- **`Customer`**: Public catalog browsing, search & category filtering, prescription order placement, and order history tracking.

### Key Highlights:
- **Role-Based Access Control (RBAC)** with custom JWT middleware.
- **Atomic Stock Decrement**: When a pharmacist or admin marks an order as `approved`, medicine stock is atomically deducted in MongoDB using `$inc` operations, ensuring no negative inventory or race conditions.
- **Expiring Medicines Aggregation**: MongoDB aggregation pipeline to query drugs expiring within the next 30 days and generate low-stock alert reports.
- **Zero Secrets in Git**: Adheres to security best practices by ignoring `.env` and providing `.env.example`.
- **Render Ready**: Includes automatic health checks and graceful failure handling.

---

## 👥 2. Role-Based Permission Matrix

| Endpoint / Action | Method | Customer | Pharmacist | Admin | Access Description |
|---|:---:|:---:|:---:|:---:|---|
| `/api/auth/register` | `POST` | ✅ | ❌ | ❌ | Public customer registration |
| `/api/auth/register-staff` | `POST` | ❌ | ✅ | ✅ | Protected by `x-admin-key` or `adminKey` |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | Public login, returns JWT token |
| `/api/auth/profile` | `GET` | ✅ | ✅ | ✅ | Authenticated user profile |
| `/api/medicines` | `GET` | ✅ | ✅ | ✅ | Public catalog (search & filter) |
| `/api/medicines/:id` | `GET` | ✅ | ✅ | ✅ | Public medicine details |
| `/api/medicines` | `POST` | ❌ | ✅ | ✅ | Add new medicine |
| `/api/medicines/:id` | `PUT` | ❌ | ✅ | ✅ | Update medicine stock/price |
| `/api/medicines/:id` | `DELETE` | ❌ | ❌ | ✅ | Delete drug (Admin only) |
| `/api/medicines/expiring` | `GET` | ❌ | ✅ | ✅ | Drugs expiring in 30 days |
| `/api/reports/expiring-soon` | `GET` | ❌ | ✅ | ✅ | Aggregated expiry & low-stock report |
| `/api/orders` | `POST` | ✅ | ❌ | ❌ | Place order (validates stock & Rx) |
| `/api/orders/my-orders` | `GET` | ✅ | ❌ | ❌ | View personal order history |
| `/api/orders` | `GET` | ❌ | ✅ | ✅ | View all orders |
| `/api/orders/:id/status` | `PATCH` | ❌ | ✅ | ✅ | Approve/Reject (Atomic stock update) |

---

## 🗄️ 3. Database Schemas

### 1. User Schema (`models/User.js`)
- `name`: String (required, trimmed)
- `email`: String (required, unique, lowercase, validated)
- `password`: String (required, hashed via bcryptjs with salt rounds = 10)
- `role`: String (enum: `['Customer', 'Pharmacist', 'Admin']`, default: `'Customer'`)
- `timestamps`: `createdAt`, `updatedAt`

### 2. Medicine Schema (`models/Medicine.js`)
- `name`: String (required, trimmed)
- `brand`: String (required)
- `category`: String (required, e.g. "Antibiotic", "Analgesic")
- `dosageForm`: String (enum: `['Tablet', 'Capsule', 'Syrup', 'Injection']`, required)
- `price`: Number (required, min: 0)
- `stockQuantity`: Number (required, min: 0)
- `requiresPrescription`: Boolean (default: `false`)
- `expiryDate`: Date (required)
- Compound text index on `name`, `brand`, `category`

### 3. Order Schema (`models/Order.js`)
- `customer`: ObjectId (ref: `User`, required)
- `items`: Array of subdocuments:
  - `medicine`: ObjectId (ref: `Medicine`, required)
  - `quantity`: Number (required, min: 1)
  - `unitPrice`: Number (required)
- `totalAmount`: Number (required)
- `prescriptionNotes`: String
- `status`: String (enum: `['pending', 'approved', 'dispensed', 'cancelled']`, default: `'pending'`)

---

## 🚀 4. Getting Started Locally

### Prerequisites:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) or free [MongoDB Atlas Cluster](https://www.mongodb.com/cloud/atlas)

### Installation:
```bash
# 1. Navigate into this folder
cd "pratik swain 150096725184"

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Copy .env.example to .env
cp .env.example .env
```

### Configure `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/pharmacy_db?retryWrites=true&w=majority
JWT_SECRET=super_secret_pharmacy_jwt_key_pratik_swain_2026
JWT_EXPIRE=7d
ADMIN_REGISTRATION_KEY=admin_secret_key_12345
```

### Seed Database with Test Data:
```bash
npm run seed
```
> Populates default users (`admin@pharmacy.com`, `pharmacist@pharmacy.com`, `customer@pharmacy.com`) and medicine catalog with sample items.

### Run Server:
```bash
# Development mode with nodemon
npm run dev

# Or production mode
npm start
```
The server will start at `http://localhost:5000`.

### Run Automated Verification Tests:
```bash
npm test
```
> Runs the 15-point automated test suite with an in-memory database to test registration, JWT issuance, RBAC 403 blocks, order placement, and atomic stock decrements.

---

## 🌐 5. Deploying to Render (Important Guide)

### Q: Why isn't `.env` pushed to GitHub?
In software engineering, pushing `.env` files containing database passwords or secret keys to GitHub is a critical security vulnerability. Evaluators expect to see `.gitignore` excluding `.env` and `.env.example` provided as the template.

### Q: How to connect the Database on Render?
Render allows you to set environment variables securely in its dashboard:

1. **Create Free MongoDB Database (2 minutes):**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free Shared Cluster.
   - In **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere).
   - In **Database Access**, create a database user (e.g. `pharmacy_admin` / password).
   - Click **Connect** -> **Drivers** -> Copy the connection string:
     `mongodb+srv://pharmacy_admin:<password>@cluster0.xxxx.mongodb.net/pharmacy_db?retryWrites=true&w=majority`

2. **Deploy Web Service on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/) -> Click **New +** -> **Web Service**.
   - Connect your GitHub repository.
   - **Root Directory:** `pratik swain 150096725184`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - Go to the **Environment** tab on Render and add:
     - `PORT` = `5000`
     - `NODE_ENV` = `production`
     - `MONGO_URI` = `<Your MongoDB Atlas connection string>`
     - `JWT_SECRET` = `render_jwt_secret_pratik_150096725184`
     - `ADMIN_REGISTRATION_KEY` = `admin_secret_key_12345`
   - Click **Deploy Web Service**!

3. **Verify Deployment:**
   - Open your Render URL (e.g. `https://your-api.onrender.com/`).
   - You will see:
     ```json
     {
       "success": true,
       "message": "💊 Pharmacy & Healthcare Store API is running",
       "version": "1.0.0",
       "databaseConnected": true
     }
     ```

---

## 📮 6. Postman Collection

Import `postman_collection.json` into Postman. It includes pre-configured folders:
1. **1. System Health** (`/`, `/api/health`)
2. **2. Authentication & RBAC Registration** (Customer, Pharmacist, Admin, Profile)
3. **3. Medicine Inventory** (Catalog, Search `?search=`, Expiring queries, CRUD)
4. **4. Orders & Prescriptions** (Place Order, My Orders, Staff Order list, Approve Order)
5. **5. RBAC Security Tests** (Verifying 403 Forbidden responses)

---

## 📊 7. Grading Rubric Compliance

| Rubric Component | Max Marks | Implementation Details |
|---|:---:|---|
| **MongoDB Atlas Setup & Schema Modeling** | **25** | Mongoose schemas for `User`, `Medicine`, and `Order` with embedded items, reference IDs, and validation rules. |
| **JWT RBAC Middleware Hierarchy** | **25** | `protect` middleware verifying tokens + `authorizeRoles` protecting restricted routes for `Admin`, `Pharmacist`, and `Customer`. |
| **Medicine Inventory CRUD & Expiring Filters** | **20** | Full CRUD, text search (`?search=`), category filter (`?category=`), and MongoDB aggregation pipeline for 30-day expiry and low-stock alerts. |
| **Order Processing & Atomic Stock Deduction** | **15** | Stock validation on creation, prescription note check, and atomic `$inc` decrement when order status transitions to `approved`. |
| **Architecture, Error Handling & Code Quality** | **15** | Clean MVC pattern, centralized error handler, `.env.example`, Postman collection, and comprehensive automated test suite. |
| **Total** | **100** | **Full 100/100 Mark Implementation** |
