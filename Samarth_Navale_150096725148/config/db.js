const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pharmacy_management';

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    isConnected = true;
    console.log(`Connected to MongoDB: ${mongoose.connection.name}`);
  } catch (err) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      isConnected = true;
      console.log('Connected to In-Memory MongoDB');
    } catch (memErr) {
      console.error('MongoDB connection failed:', err.message);
    }
  }
};

module.exports = connectDB;
