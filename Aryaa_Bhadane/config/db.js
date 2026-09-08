const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas cluster
 * Uses MONGO_URI from environment variables.
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error('CRITICAL: MONGO_URI is not defined in environment variables.');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(` MongoDB Atlas Connected successfully: ${conn.connection.host} / Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    // Exit process with failure code
    process.exit(1);
  }
};

module.exports = connectDB;
