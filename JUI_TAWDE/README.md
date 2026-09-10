# Pharmacy & Healthcare Store API

REST API for pharmacy management and medicine ordering with MongoDB Atlas, JWT authentication, bcryptjs password hashing, and Role-Based Access Control (RBAC).

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT
- bcryptjs
- dotenv
- cors

## Roles

- **Customer** — browse medicines, place orders, view own orders
- **Pharmacist** — manage medicines, view/approve orders, view expiring medicines
- **Admin** — all pharmacist permissions plus delete medicines and staff registration

## Setup

```bash
npm install
```

Create a `.env` file from `.env.example` and add your MongoDB Atlas connection string, JWT secret, and admin key.

Start development server:

```bash
npm run dev
```

Start normally:

```bash
npm start
```

Server runs on:

```text
http://localhost:5000
```

## API Endpoints

### Authentication

- `POST /api/auth/register` — Register customer
- `POST /api/auth/register-staff` — Register pharmacist/admin using `ADMIN_KEY`
- `POST /api/auth/login` — Login
- `GET /api/auth/profile` — Current authenticated profile

### Medicines

- `GET /api/medicines` — Browse all medicines
- `GET /api/medicines?search=paracetamol`
- `GET /api/medicines?category=Analgesic`
- `GET /api/medicines/expiring` — Pharmacist/Admin
- `POST /api/medicines` — Pharmacist/Admin
- `PUT /api/medicines/:id` — Pharmacist/Admin
- `DELETE /api/medicines/:id` — Admin

### Orders

- `POST /api/orders` — Customer
- `GET /api/orders/my-orders` — Customer
- `GET /api/orders` — Pharmacist/Admin
- `PATCH /api/orders/:id/status` — Pharmacist/Admin

For protected routes, send:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

## Example Requests

### Register Customer

```json
{
  "name": "Jui",
  "email": "jui@example.com",
  "password": "password123"
}
```

### Register Staff

```json
{
  "name": "Pharmacist One",
  "email": "pharmacist@example.com",
  "password": "password123",
  "role": "pharmacist",
  "adminKey": "your_admin_registration_key"
}
```

### Add Medicine

```json
{
  "name": "Paracetamol",
  "brand": "CureMed",
  "category": "Analgesic",
  "dosageForm": "Tablet",
  "price": 25,
  "stockQuantity": 100,
  "requiresPrescription": false,
  "expiryDate": "2027-12-31"
}
```

### Place Order

```json
{
  "items": [
    {
      "medicine": "MEDICINE_ID",
      "quantity": 2
    }
  ],
  "prescriptionNotes": ""
}
```

### Approve Order

```json
{
  "status": "approved"
}
```

When an order changes from `pending` to `approved`, stock is decremented atomically using MongoDB transactions and conditional stock updates.

## RBAC Matrix

| Action | Customer | Pharmacist | Admin |
|---|:---:|:---:|:---:|
| Register customer | Yes | No | No |
| Register staff | No | No | Yes* |
| Browse medicines | Yes | Yes | Yes |
| Add medicine | No | Yes | Yes |
| Update medicine | No | Yes | Yes |
| Delete medicine | No | No | Yes |
| Place order | Yes | No | No |
| View own orders | Yes | No | No |
| View all orders | No | Yes | Yes |
| Approve/reject/dispense | No | Yes | Yes |
| View expiring medicines | No | Yes | Yes |

`*` Staff registration is protected by the configured `ADMIN_KEY`.

## Notes

MongoDB transactions require a replica set or MongoDB Atlas deployment. MongoDB Atlas supports the required transaction functionality.

Do not commit `.env` to GitHub.
