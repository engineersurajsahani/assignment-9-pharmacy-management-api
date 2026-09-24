const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route (Uptime monitoring / Render deployment check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Pharmacy & Healthcare Store API',
  });
});

// Welcome / Index Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Pharmacy & Healthcare Store API',
    docs: '/api/health',
    version: '1.0.0',
  });
});

// Mount Resource Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Reports route alias for expiring medicines (Pharmacist / Admin)
const { protect } = require('./middleware/auth');
const { authorizeRoles } = require('./middleware/roleGuard');
const { getExpiringMedicines } = require('./controllers/medicineController');
app.get(
  '/api/reports/expiring-soon',
  protect,
  authorizeRoles('pharmacist', 'admin'),
  getExpiringMedicines
);

// 404 Route Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Pharmacy API Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
});

module.exports = app;
