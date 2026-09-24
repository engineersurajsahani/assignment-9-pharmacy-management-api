# 💊 Pharmacy & Healthcare Store API

A RESTful **Pharmacy Management & Medicine Ordering API** built using **Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcryptjs, and dotenv**.

## 🚀 Live Deployment

[**https://assignment-9-pharmacy-management-api-lxpm.onrender.com**](https://assignment-9-pharmacy-management-api-lxpm.onrender.com)

## 🛠️ Tech Stack

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose
* JWT Authentication
* bcryptjs
* dotenv
* CORS

## ✨ Features

* Customer registration and login
* JWT-based authentication
* Role-Based Access Control (RBAC)
* Customer, Pharmacist, and Admin roles
* Medicine inventory management
* Medicine search and category filtering
* Expiring medicine tracking
* Customer medicine ordering
* Order status management
* Automatic stock deduction after approval
* Secure password hashing

## 👥 User Roles

| Role       | Main Permissions                    |
| ---------- | ----------------------------------- |
| Customer   | Browse medicines and place orders   |
| Pharmacist | Manage medicines and process orders |
| Admin      | Full medicine and order management  |

## 📌 Main API Routes

| Method | Endpoint                  | Description             |
| ------ | ------------------------- | ----------------------- |
| POST   | `/api/auth/register`      | Register customer       |
| POST   | `/api/auth/login`         | Login and receive JWT   |
| GET    | `/api/auth/profile`       | Get user profile        |
| GET    | `/api/medicines`          | View medicines          |
| GET    | `/api/medicines/expiring` | View expiring medicines |
| POST   | `/api/medicines`          | Add medicine            |
| PUT    | `/api/medicines/:id`      | Update medicine         |
| DELETE | `/api/medicines/:id`      | Delete medicine         |
| POST   | `/api/orders`             | Place an order          |
| GET    | `/api/orders/my-orders`   | View order history      |
| GET    | `/api/orders`             | View all orders         |
| PATCH  | `/api/orders/:id/status`  | Update order status     |

## 🗄️ Database

The API uses **MongoDB Atlas with Mongoose**.

Main models:

* `User`
* `Medicine`
* `Order`

## 👨‍💻 Assignment

**Assignment 09 – Pharmacy & Healthcare Store API**

Backend Development Assignment.
