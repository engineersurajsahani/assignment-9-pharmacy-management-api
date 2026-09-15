const mongoose = require('mongoose');

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pharmacy_management_api';
    await mongoose.connect(uri);
    console.log('[MongoDB] Connected:', mongoose.connection.host);
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
