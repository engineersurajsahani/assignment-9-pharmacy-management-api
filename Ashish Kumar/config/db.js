const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('⚠️ WARNING: MONGO_URI is not defined in environment variables.');
    console.warn('ℹ️ Running in disconnected mode. Please configure MONGO_URI in .env or Render dashboard.');
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // fail fast if cluster is unreachable
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('💡 Tip: Make sure your IP address is whitelisted (0.0.0.0/0) in MongoDB Atlas and credentials are valid.');
    return false;
  }
};

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDB, isDbConnected };
