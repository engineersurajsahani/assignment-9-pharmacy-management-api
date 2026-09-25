require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, isDbConnected } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route files
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { getExpiringMedicines } = require('./controllers/medicineController');
const { protect } = require('./middleware/auth');
const { authorizeRoles } = require('./middleware/roleGuard');

// Connect to MongoDB Atlas
connectDB();

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Root & Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '💊 Pharmacy & Healthcare Store API is running',
    version: '1.0.0',
    databaseConnected: isDbConnected(),
    documentation: '/api/health',
    endpoints: {
      auth: '/api/auth',
      medicines: '/api/medicines',
      orders: '/api/orders',
      reports: '/api/reports/expiring-soon'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      connected: isDbConnected(),
      state: isDbConnected() ? 'connected' : 'disconnected/waiting'
    },
    service: 'Pharmacy Management & Medicine Ordering REST API',
    developer: 'Pratik Swain (150096725184)'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/orders', orderRoutes);

// Report Route alias from Assignment Table: GET /api/reports/expiring-soon
app.get(
  '/api/reports/expiring-soon',
  protect,
  authorizeRoles('Admin', 'Pharmacist'),
  getExpiringMedicines
);

// 404 & Error Handler Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Pharmacy API Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`🌐 Health check available at: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Keep server running so it doesn't crash on connection retries
});

module.exports = app;
