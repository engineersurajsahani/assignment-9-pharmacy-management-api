# 💊 Pharmacy & Healthcare Store API

A production-grade Pharmacy Management & Medicine Ordering REST API using MongoDB Atlas and JWT-based Role-Based Access Control (RBAC).

## 👨‍🎓 Student Details

**Name:** Harsh Kumar  
**Roll No.:** 150096725105  
**Course:** BTech CSE  
**Assignment:** 9 — Pharmacy & Healthcare Store API with RBAC & JWT  

## ✨ Features

- **RBAC (Role-Based Access Control):** Three user tiers: `Admin`, `Pharmacist`, and `Customer`, with strict permission barriers.
- **Inventory Management:** Adding restricted prescription medicines, querying expiring medicine, and stock alerts.
- **Order Processing:** Customers can place orders. Pharmacists/Admins can approve or dispense orders.
- **Atomic Stock Decrement:** Stock is automatically decremented when an order is approved.
- **Authentication:** Secure JWT authentication and bcrypt password hashing.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JSON Web Tokens (JWT), bcryptjs
- **Environment:** dotenv

## 📁 Project Structure

```text
Harsh-Assignment-9-pharmacy-Management-Api/
├── config/
│   └── db.js                 # MongoDB Atlas connection
├── controllers/
│   ├── authController.js     # JWT & password logic
│   ├── medicineController.js # Medicine CRUD & expiring stock query
│   └── orderController.js    # Order lifecycle & inventory deductions
├── middleware/
│   ├── auth.js               # Verify JWT
│   └── roleGuard.js          # authorizeRoles('Admin', 'Pharmacist')
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
└── server.js
```

## 🚀 Getting Started

### Prerequisites

- Node.js installed
- MongoDB installed locally or MongoDB Atlas connection string

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/harsh4421/Harsh-Assignment-9-pharmacy-Management-Api.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Harsh-Assignment-9-pharmacy-Management-Api
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file based on `.env.example`:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/pharmacy-management
   JWT_SECRET=your_super_secret_jwt_key
   ```

5. Start the server:
   ```bash
   npm start
   ```

   For development with nodemon:
   ```bash
   npm run dev
   ```

## 📋 API Endpoints

### 🔐 Auth Routes

| Method | Endpoint | Access Level | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | Public | Register customer account |
| `POST` | `/api/auth/login` | Public | Login with email/password, receive JWT |
| `GET` | `/api/auth/profile` | Authenticated | Get current user's profile |

### 💊 Medicine Inventory Routes

| Method | Endpoint | Access Level | Description |
|---|---|:---:|---|
| `GET` | `/api/medicines` | Public | List medicines with search & category filter |
| `GET` | `/api/medicines/expiring` | Pharmacist / Admin | Query drugs expiring in the next 30 days |
| `POST` | `/api/medicines` | Pharmacist / Admin | Add new medicine |
| `PUT` | `/api/medicines/:id` | Pharmacist / Admin | Update stock or pricing |
| `DELETE` | `/api/medicines/:id` | Admin Only | Delete drug from database |

### 📦 Order & Prescription Routes

| Method | Endpoint | Access Level | Description |
|---|---|:---:|---|
| `POST` | `/api/orders` | Customer | Place an order for medicines |
| `GET` | `/api/orders/my-orders` | Customer | View customer order history |
| `GET` | `/api/orders` | Pharmacist / Admin | List all pending & processed orders |
| `PATCH` | `/api/orders/:id/status` | Pharmacist / Admin | Update status to `approved`/`dispensed` |
