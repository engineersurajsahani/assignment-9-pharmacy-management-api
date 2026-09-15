require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Pharmacy & Healthcare Store API',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register customer',
        'POST /api/auth/register-staff': 'Register pharmacist/admin (requires key)',
        'POST /api/auth/login': 'Login → JWT',
        'GET /api/auth/profile': 'Get profile (auth required)'
      },
      medicines: {
        'GET /api/medicines': 'List medicines (search, category filter)',
        'GET /api/medicines/:id': 'Get medicine by ID',
        'GET /api/medicines/expiring': 'Expiring in 30 days (pharmacist/admin)',
        'POST /api/medicines': 'Add medicine (pharmacist/admin)',
        'PUT /api/medicines/:id': 'Update medicine (pharmacist/admin)',
        'DELETE /api/medicines/:id': 'Delete medicine (admin only)'
      },
      orders: {
        'POST /api/orders': 'Place order (customer only)',
        'GET /api/orders/my-orders': 'My orders (customer only)',
        'GET /api/orders': 'All orders (pharmacist/admin)',
        'PATCH /api/orders/:id/status': 'Update status (pharmacist/admin)'
      }
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    db: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
