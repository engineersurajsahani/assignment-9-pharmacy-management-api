# 💊 Pharmacy & Healthcare Store API

A production-grade, secure RESTful API for Pharmacy Management and Medicine Ordering built with **Node.js**, **Express.js**, **MongoDB Atlas**, **Mongoose**, and **JSON Web Tokens (JWT)**.

This API features robust **Role-Based Access Control (RBAC)** across three roles (`Admin`, `Pharmacist`, `Customer`), atomic inventory management using MongoDB transactions, prescription verification flags, and expiring medicine aggregation.

---

## 🚀 Live Demo & Links
- **Live Render URL**: https://pari-gothi-assignment-9-pharmacy.onrender.com
- **GitHub Repository**: https://github.com/Parii22/Pari-Gothi-_assignment-9-pharmacy-management-api

---

## 🛠 Tech Stack & Dependencies

- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) with [Mongoose](https://mongoosejs.com/) ODM
- **Authentication**: [jsonwebtoken (JWT)](https://github.com/auth0/node-jsonwebtoken)
- **Security & Hashing**: [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Environment Management**: [dotenv](https://github.com/motdotla/dotenv)
- **Cross-Origin Resource Sharing**: [cors](https://github.com/expressjs/cors)
- **Development Tooling**: [nodemon](https://nodemon.io/)

---

## 🏛 Directory Architecture

```
Pari_Gothi/
├── config/
│   └── db.js                 # MongoDB Atlas connection & error handling
├── controllers/
│   ├── authController.js     # JWT generation, customer & staff registration, login
│   ├── medicineController.js # Medicine inventory CRUD & 30-day expiry aggregation
│   └── orderController.js    # Order lifecycle, prescription check & atomic stock deduction
├── middleware/
│   ├── auth.js               # JWT Bearer token authentication & user context
│   ├── roleGuard.js          # RBAC authorizeRoles('admin', 'pharmacist', 'customer')
│   └── errorHandler.js       # Centralized error handler with standardized JSON responses
├── models/
│   ├── User.js               # User schema with bcrypt pre-save password hash & RBAC roles
│   ├── Medicine.js           # Medicine catalog schema (dosageForm enum, price, stock, expiry)
│   └── Order.js              # Order schema with nested items, status enum & timestamps
├── routes/
│   ├── authRoutes.js         # /api/auth routes
│   ├── medicineRoutes.js     # /api/medicines routes
│   └── orderRoutes.js        # /api/orders routes
├── .env.example              # Environment variable templates
├── .gitignore                # Git exclusions (node_modules, .env, logs)
├── package.json              # Project dependencies and npm scripts
├── postman_collection.json   # Full Postman test collection covering all roles
├── server.js                 # Main server initialization & route mounting
└── README.md                 # Project documentation & deployment guide
```

---

## 🔐 Role-Based Permission Matrix (RBAC)

| Endpoint | Method | Public | Customer | Pharmacist | Admin | Description |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `/api/health` | `GET` | ✅ | ✅ | ✅ | ✅ | Uptime & health check |
| `/api/auth/register` | `POST` | ✅ | ✅ | ❌ | ❌ | Register as Customer |
| `/api/auth/register-staff` | `POST` | 🔑* | ❌ | ✅ | ✅ | Register Staff (*Admin Key required) |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | ✅ | Login & receive JWT |
| `/api/auth/profile` | `GET` | ❌ | ✅ | ✅ | ✅ | Get profile of logged-in user |
| `/api/medicines` | `GET` | ✅ | ✅ | ✅ | ✅ | Browse catalog (search & filter) |
| `/api/medicines/expiring` | `GET` | ❌ | ❌ | ✅ | ✅ | Medicines expiring within 30 days |
| `/api/medicines` | `POST` | ❌ | ❌ | ✅ | ✅ | Add new medicine to inventory |
| `/api/medicines/:id` | `PUT` | ❌ | ❌ | ✅ | ✅ | Update medicine stock / price |
| `/api/medicines/:id` | `DELETE` | ❌ | ❌ | ❌ | ✅ | Delete medicine (**Admin Only**) |
| `/api/orders` | `POST` | ❌ | ✅ | ❌ | ❌ | Place medicine order |
| `/api/orders/my-orders` | `GET` | ❌ | ✅ | ❌ | ❌ | View customer order history |
| `/api/orders` | `GET` | ❌ | ❌ | ✅ | ✅ | View all orders across system |
| `/api/orders/:id` | `GET` | ❌ | ✅ (Own) | ✅ | ✅ | View order details |
| `/api/orders/:id/status` | `PATCH` | ❌ | ❌ | ✅ | ✅ | Update status / Approve (Atomically decrements stock) |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pharmacy_db?retryWrites=true&w=majority
JWT_SECRET=super_secret_pharmacy_jwt_key_2024
JWT_EXPIRES_IN=7d
ADMIN_REGISTRATION_KEY=admin_secret_key_12345
```

---

## 📦 Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/itm-assignment-09-pharmacy-api.git
   cd itm-assignment-09-pharmacy-api/Pari_Gothi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB Atlas credentials and secrets
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. **Run in Production Mode**:
   ```bash
   npm start
   ```

---

## 📖 API Request & Response Examples

### 1. Register Customer (`POST /api/auth/register`)
**Request Body**:
```json
{
  "name": "Alice Customer",
  "email": "alice@example.com",
  "password": "password123"
}
```
**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Customer registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "660c1a2b3c4d5e6f7a8b9c0d",
    "name": "Alice Customer",
    "email": "alice@example.com",
    "role": "customer",
    "createdAt": "2026-03-24T12:00:00.000Z"
  }
}
```

### 2. Register Staff (`POST /api/auth/register-staff`)
**Request Body**:
```json
{
  "name": "Bob Pharmacist",
  "email": "bob@pharmacy.com",
  "password": "password123",
  "role": "pharmacist",
  "adminKey": "admin_secret_key_12345"
}
```
**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Staff account (pharmacist) registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "660c1a2b3c4d5e6f7a8b9c0e",
    "name": "Bob Pharmacist",
    "email": "bob@pharmacy.com",
    "role": "pharmacist"
  }
}
```

### 3. Add Medicine (`POST /api/medicines`)
**Headers**: `Authorization: Bearer <PHARMACIST_OR_ADMIN_TOKEN>`
**Request Body**:
```json
{
  "name": "Amoxicillin 500mg",
  "brand": "Amoxil",
  "category": "Antibiotic",
  "dosageForm": "Capsule",
  "price": 18.50,
  "stockQuantity": 100,
  "requiresPrescription": true,
  "expiryDate": "2026-12-31T00:00:00.000Z"
}
```
**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Medicine added successfully to inventory",
  "data": {
    "_id": "660c1a2b3c4d5e6f7a8b9c10",
    "name": "Amoxicillin 500mg",
    "brand": "Amoxil",
    "category": "Antibiotic",
    "dosageForm": "Capsule",
    "price": 18.5,
    "stockQuantity": 100,
    "requiresPrescription": true,
    "expiryDate": "2026-12-31T00:00:00.000Z"
  }
}
```

### 4. Place Order (`POST /api/orders`)
**Headers**: `Authorization: Bearer <CUSTOMER_TOKEN>`
**Request Body**:
```json
{
  "items": [
    {
      "medicineId": "660c1a2b3c4d5e6f7a8b9c10",
      "quantity": 2
    }
  ],
  "prescriptionNotes": "Dr. Sarah Smith, License #MD87654, 1 capsule 2x daily after food"
}
```
**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Order placed successfully with pending status",
  "data": {
    "_id": "660c1a2b3c4d5e6f7a8b9c20",
    "customer": {
      "_id": "660c1a2b3c4d5e6f7a8b9c0d",
      "name": "Alice Customer",
      "email": "alice@example.com"
    },
    "items": [
      {
        "medicine": {
          "_id": "660c1a2b3c4d5e6f7a8b9c10",
          "name": "Amoxicillin 500mg",
          "brand": "Amoxil",
          "price": 18.5,
          "requiresPrescription": true
        },
        "quantity": 2,
        "unitPrice": 18.5
      }
    ],
    "totalAmount": 37.00,
    "prescriptionNotes": "Dr. Sarah Smith, License #MD87654, 1 capsule 2x daily after food",
    "status": "pending"
  }
}
```

### 5. Approve Order & Trigger Atomic Stock Deduction (`PATCH /api/orders/:id/status`)
**Headers**: `Authorization: Bearer <PHARMACIST_OR_ADMIN_TOKEN>`
**Request Body**:
```json
{
  "status": "approved"
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Order status successfully updated from 'pending' to 'approved'",
  "data": {
    "_id": "660c1a2b3c4d5e6f7a8b9c20",
    "status": "approved",
    "items": [
      {
        "medicine": {
          "_id": "660c1a2b3c4d5e6f7a8b9c10",
          "name": "Amoxicillin 500mg",
          "stockQuantity": 98
        },
        "quantity": 2,
        "unitPrice": 18.5
      }
    ]
  }
}
```

---

## 🌐 Step-by-Step Guide: MongoDB Atlas Setup

1. **Sign Up / Log In**: Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. **Create a Free Cluster**:
   - Choose **M0 Free Tier**.
   - Select your preferred cloud provider (AWS/GCP) and closest region.
   - Click **Create Deployment**.
3. **Configure Database User**:
   - Go to **Security** → **Database Access** → **Add New Database User**.
   - Select **Password Authentication**.
   - Create a username (e.g. `pharmacy_admin`) and secure password.
   - Assign role **Built-in Role: Read and write to any database**.
4. **Configure Network Access (Crucial for Render)**:
   - Go to **Security** → **Network Access** → **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Click **Confirm**.
5. **Get Connection String**:
   - Go to **Database** → **Deployments** → Click **Connect**.
   - Choose **Drivers** (Node.js).
   - Copy the URI: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pharmacy_db?retryWrites=true&w=majority`.
   - Replace `<username>` and `<password>` with your database user credentials.

---

## 📤 Step-by-Step Guide: Push to GitHub

```bash
# Navigate to the project directory
cd /path/to/Pari_Gothi

# Initialize git repository (if not already initialized)
git init

# Verify .gitignore is present so .env and node_modules are not tracked
git status

# Add files and commit
git add .
git commit -m "Initial commit: Production Pharmacy & Healthcare Store REST API"

# Set main branch
git branch -M main

# Add your GitHub remote repository
git remote add origin https://github.com/<your-username>/itm-assignment-09-pharmacy-api.git

# Push code to GitHub
git push -u origin main
```

---

## ☁️ Step-by-Step Guide: Deploy to Render

1. Sign up / log in to [render.com](https://render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository: `itm-assignment-09-pharmacy-api`.
4. Configure service settings:
   - **Name**: `itm-assignment-09-pharmacy-api` (or `pharmacy-management-api`)
   - **Region**: Choose region closest to you
   - **Branch**: `main`
   - **Root Directory**: `Pari_Gothi` (if repository root contains the subfolder) or leave empty if at root
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `MONGO_URI` = `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pharmacy_db?retryWrites=true&w=majority`
   - `JWT_SECRET` = `super_secret_production_jwt_key_987654`
   - `JWT_EXPIRES_IN` = `7d`
   - `ADMIN_REGISTRATION_KEY` = `admin_secret_key_12345`
   - `NODE_ENV` = `production`
6. Click **Create Web Service**.
7. Wait for the build logs to show `MongoDB Connected` and `Pharmacy API Server is running`.
8. Test your live deployment via `GET https://<your-service-name>.onrender.com/api/health`.

---

## 🧪 Testing with Postman

1. Open Postman.
2. Click **Import** → Select `postman_collection.json`.
3. Set the `baseUrl` variable to your local `http://localhost:5000` or your live Render URL `https://<service>.onrender.com`.
4. Run requests in sequence:
   - Register Staff / Customer → automatically sets auth token variables.
   - Execute catalog, order, and status workflow.
