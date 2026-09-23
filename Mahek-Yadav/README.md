# Assignment 09 - Pharmacy & Healthcare Store API

Live link - https://pharmacy-management-api-7pmv.onrender.com

## Tech stack
Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcryptjs, dotenv, cors.

## Setup
```bash
npm install
cp .env.example .env
npm run dev
```

Set these values in `.env`:
- `PORT=4000`
- `MONGO_URI=your MongoDB Atlas connection string`
- `JWT_SECRET=your secret`
- `ADMIN_KEY=your staff registration key`

## Endpoints

### Auth
- `POST /api/auth/register` - customer registration
- `POST /api/auth/register-staff` - create pharmacist/admin using admin key
- `POST /api/auth/login` - login and receive JWT
- `GET /api/auth/profile` - authenticated profile

### Medicines
- `GET /api/medicines`
- `GET /api/medicines?search=paracetamol`
- `GET /api/medicines?category=Analgesic`
- `GET /api/medicines/expiring` - pharmacist/admin
- `POST /api/medicines` - pharmacist/admin
- `PUT /api/medicines/:id` - pharmacist/admin
- `DELETE /api/medicines/:id` - admin

### Orders
- `POST /api/orders` - customer
- `GET /api/orders/my-orders` - customer
- `GET /api/orders` - pharmacist/admin
- `PATCH /api/orders/:id/status` - pharmacist/admin

For protected routes use:
`Authorization: Bearer YOUR_JWT_TOKEN`

## Example medicine
```json
{
  "name": "Paracetamol",
  "brand": "Crocin",
  "category": "Analgesic",
  "dosageForm": "Tablet",
  "price": 25,
  "stockQuantity": 100,
  "requiresPrescription": false,
  "expiryDate": "2027-12-31"
}
```

## Example order
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

## Render
Build Command: `npm install`
Start Command: `npm start`

Add environment variables in Render:
`MONGO_URI`, `JWT_SECRET`, `ADMIN_KEY`.
