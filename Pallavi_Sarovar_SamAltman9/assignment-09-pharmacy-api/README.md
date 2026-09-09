# Pharmacy & Healthcare Store API

A RESTful Pharmacy & Healthcare Store API built using Node.js, Express.js, MongoDB Atlas, and JWT-based Role-Based Access Control (RBAC).

This API supports three user roles:

- Customer
- Pharmacist
- Admin

The system provides authentication, medicine management, order management, role-based authorization, prescription handling, and atomic stock deduction during order approval.

## Features

- JWT-based authentication
- Password hashing using bcryptjs
- Role-Based Access Control (RBAC)
- Customer, Pharmacist, and Admin roles
- Medicine CRUD operations
- Medicine search and catalog listing
- Expiring medicine tracking
- Customer order placement
- Pharmacist/Admin order approval
- Automatic stock deduction after order approval
- Prevention of over-ordering
- MongoDB Atlas database integration
- MVC project architecture
- Postman API testing collection

## Technology Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JSON Web Token (JWT)
- bcryptjs
- dotenv
- Postman

## Project Structure

```text
Pallavi_Sarovar_SamAltman9/
└── assignment-09-pharmacy-api/
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
    │   ├── User.js
    │   ├── Medicine.js
    │   └── Order.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── medicineRoutes.js
    │   └── orderRoutes.js
    ├── .gitignore
    ├── package.json
    ├── package-lock.json
    ├── postman-collection.json
    ├── README.md
    └── server.js
```

> Note: `.env` and `node_modules/` are excluded from the repository using `.gitignore`.

## User Roles & Permissions

### Customer

- Register and login
- View available medicines
- Place orders
- View own orders

### Pharmacist

- Login
- Add medicines
- Update medicines
- View medicines
- View expiring medicines
- View orders
- Approve or reject orders

### Admin

- Login
- Add medicines
- Update medicines
- Delete medicines
- View medicines
- View expiring medicines
- View orders
- Approve or reject orders

## API Endpoints

### Authentication

**POST** `/api/auth/register`

Register a customer.

**POST** `/api/auth/register-staff`

Register a pharmacist or admin using the admin key.

**POST** `/api/auth/login`

Login and receive a JWT token.

### Medicines

**GET** `/api/medicines`

Get all available medicines.

**POST** `/api/medicines`

Add a new medicine.

**PUT** `/api/medicines/:id`

Update an existing medicine.

**DELETE** `/api/medicines/:id`

Delete a medicine. Admin access required.

**GET** `/api/medicines/expiring`

Get medicines that are close to expiry.

### Orders

**POST** `/api/orders`

Place an order as a customer.

**GET** `/api/orders`

View orders as a pharmacist or admin.

**PATCH** `/api/orders/:id/status`

Approve or reject an order as a pharmacist or admin.

## Authentication

Protected endpoints require a JWT token.

The token is sent using the Authorization header:

```text
Authorization: Bearer <JWT_TOKEN>
```

The API checks the user's role before allowing access to protected operations.

## Environment Variables

Create a `.env` file in the project directory.

Required variables:

```text
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
PORT=5001
ADMIN_KEY=your_admin_key
```

The `.env` file is intentionally excluded from GitHub using `.gitignore`.

## Installation & Setup

Clone the repository and navigate to the project directory.

Install dependencies:

```bash
npm install
```

Create the `.env` file and add the required environment variables.

Start the server:

```bash
node server.js
```

The API runs on:

```text
http://localhost:5001
```

## Testing with Postman

The API was tested using Postman with the following workflow:

1. Register a Customer.
2. Register a Pharmacist.
3. Register an Admin.
4. Login as the Customer.
5. Login as the Pharmacist.
6. Login as the Admin.
7. Attempt to add a medicine using the Customer token.
8. Confirm that the Customer receives a 403 Forbidden response.
9. Add a medicine using the Pharmacist token.
10. Retrieve the medicine catalog.
11. Place an order as the Customer.
12. View the pending order as the Pharmacist.
13. Approve the order as the Pharmacist.
14. Verify that the medicine stock is automatically reduced.

## API Testing Results

### 1. Customer Registration

The customer registration endpoint returned **201 Created**.

The response confirmed successful customer registration and returned a JWT token.

<img width="884" height="732" alt="Customer Registration" src="https://github.com/user-attachments/assets/422f41bc-f897-462b-97a3-062be3f9d0ed" />

### 2. Pharmacist Registration

The pharmacist registration endpoint returned **201 Created**.

The response confirmed successful staff registration with the pharmacist role.

<img width="901" height="612" alt="Pharmacist Registration" src="https://github.com/user-attachments/assets/699ddd68-9aac-4398-9838-ca4938334c03" />

### 3. Admin Registration

The admin registration endpoint returned **201 Created**.

The response confirmed successful staff registration with the admin role.

<img width="789" height="631" alt="Admin Registration" src="https://github.com/user-attachments/assets/71a8935b-3e42-4629-97f9-0529295af50c" />

### 4. Role-Based Access Control

A Customer attempted to add a medicine.

The API correctly returned **403 Forbidden** with the response:

```text
Forbidden: insufficient permissions
```

This confirms that customers cannot add medicines.

<img width="784" height="636" alt="Customer Forbidden Access" src="https://github.com/user-attachments/assets/45f3935a-eb22-47ba-af00-c00626a6725f" />

### 5. Pharmacist Adds Medicine

The Pharmacist successfully added Amoxicillin.

The API returned **201 Created**.

Medicine details included:

- Name: Amoxicillin
- Brand: Demo Pharma
- Category: Antibiotic
- Dosage Form: Capsule
- Price: 120
- Initial Stock: 20
- Prescription Required: Yes
- Expiry Date: 2027-12-31

<img width="837" height="769" alt="Pharmacist Adds Medicine" src="https://github.com/user-attachments/assets/38d5acfc-f90b-4774-9657-4a6e68dc0fdb" />

### 6. Medicine Catalog

The GET medicines endpoint returned **200 OK**.

The Amoxicillin medicine was successfully displayed with a stock quantity of 20.

<img width="718" height="704" alt="Medicine Catalog" src="https://github.com/user-attachments/assets/e127742f-f2a6-44ec-99cb-a10dc5ee5cba" />

### 7. Customer Places Order

The Customer placed an order for:

**Amoxicillin — Quantity: 2**

The API returned **201 Created**.

The order was initially created with a pending status.

<img width="774" height="693" alt="Customer Places Order" src="https://github.com/user-attachments/assets/67d2369f-2fb4-4ce7-a47a-eeb0ba1732d1" />

### 8. Pharmacist Views Pending Order

The Pharmacist successfully retrieved the order.

The API returned **200 OK**.

The order was displayed with the customer information, medicine details, quantity, and pending status.

<img width="763" height="739" alt="Pending Order" src="https://github.com/user-attachments/assets/1b62310d-8ce9-4170-971d-8a509b2c09e2" />

### 9. Pharmacist Approves Order

The Pharmacist approved the pending order.

The API returned **200 OK**.

Response:

```text
Order approved successfully
```

<img width="735" height="762" alt="Order Approved" src="https://github.com/user-attachments/assets/8ff7b795-feed-414e-8e28-d78b8d34a0a0" />

### 10. Stock Deduction

After approval, the Amoxicillin stock changed from:

**20 → 18**

This confirms that the API automatically deducts the ordered quantity from medicine stock when an order is approved.

<img width="668" height="677" alt="Stock Deducted" src="https://github.com/user-attachments/assets/f6ef80e1-bb04-485b-9f16-351ca69f719c" />

## Postman Collection

The complete API testing collection is included in the project as:

`postman-collection.json`

It contains the authentication, medicine, and order API requests used for testing the application.

## Conclusion

The Pharmacy & Healthcare Store API successfully implements authentication, JWT-based authorization, Role-Based Access Control, medicine management, order processing, and automatic stock management.

The testing confirms that customers are restricted from pharmacist/admin operations, pharmacists can manage medicines and orders, and approved orders correctly deduct medicine stock.
