require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Pharmacy Management API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/profile': 'Get user profile (authenticated)'
      },
      medicines: {
        'GET /api/medicines': 'List all medicines (public)',
        'GET /api/medicines/expiring': 'Get expiring medicines (Pharmacist/Admin)',
        'GET /api/medicines/:id': 'Get medicine by ID',
        'POST /api/medicines': 'Add medicine (Pharmacist/Admin)',
        'PUT /api/medicines/:id': 'Update medicine (Pharmacist/Admin)',
        'DELETE /api/medicines/:id': 'Delete medicine (Admin only)'
      },
      orders: {
        'POST /api/orders': 'Place order (Customer)',
        'GET /api/orders/my-orders': 'Get customer orders (Customer)',
        'GET /api/orders': 'Get all orders (Pharmacist/Admin)',
        'PATCH /api/orders/:id/status': 'Update order status (Pharmacist/Admin)'
      }
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
    error: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found.'
  });
});

const PORT = process.env.PORT || 3009;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
