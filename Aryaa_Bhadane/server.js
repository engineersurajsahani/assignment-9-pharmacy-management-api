const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Initialize MongoDB Atlas connection
connectDB();

const app = express();

// Standard Express Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check & Root Welcome Endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Pharmacy Management & Medicine Ordering REST API',
    version: '1.0.0',
    status: 'Healthy',
    docs: {
      auth: '/api/auth',
      medicines: '/api/medicines',
      orders: '/api/orders',
      reports: '/api/reports'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mount API Route Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

// Catch-All 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(` Pharmacy API Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // In production, log and shutdown gracefully
});

module.exports = app;
