const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database if not in test environment without MONGO_URI
if (process.env.NODE_ENV !== 'test' || process.env.MONGO_URI) {
  connectDB();
}

const app = express();

// Body Parser & CORS Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Root Health & API Info Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Pharmacy & Healthcare Store API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      medicines: '/api/medicines',
      orders: '/api/orders',
      reports: '/api/reports'
    }
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route Not Found - ${req.originalUrl}`
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
