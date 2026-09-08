# Assignment 9 - Pharmacy & Healthcare Store REST API
https://saiyashpoojariassignment-9-pharmacy.onrender.com (Render URL)
## Overview

A production-grade REST API for managing a Pharmacy and Healthcare Store using Node.js, Express.js, MongoDB Atlas, Mongoose, JWT authentication and bcryptjs.

The API provides secure authentication, role-based access control and pharmacy management functionality for users, medicines and healthcare-related operations.

## Features

- User registration and login
- JWT-based authentication
- Password hashing using bcryptjs
- Role-Based Access Control (RBAC)
- Pharmacy and medicine management
- Medicine ordering functionality
- MongoDB Atlas database integration
- Mongoose ODM
- Input validation
- Authentication middleware
- Authorization middleware
- Error handling
- Environment variable configuration
- RESTful API architecture
- Postman API testing

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JSON Web Token (JWT)
- bcryptjs
- dotenv
- Postman

## Authentication

The API uses JWT authentication for securing protected routes.

Users can register and log in using their credentials. After successful login, a JWT token is generated and used to access protected API endpoints.

Protected requests use the following header:

Authorization: Bearer YOUR_JWT_TOKEN

## Role-Based Access Control

The API implements Role-Based Access Control to restrict access to specific operations based on the authenticated user's role.

Authentication verifies the user's identity, while authorization determines whether the user has permission to perform a particular operation.

## Database

MongoDB Atlas is used as the database and Mongoose is used for database interaction and schema management.

## Project Structure

All assignment files are organized inside the `Saiyash Poojari` folder.

```text
Saiyash Poojari/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── pharmacy_api_postman_collection.json
├── README.md
├── server.js
└── test-api.js
