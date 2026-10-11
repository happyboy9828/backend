const mongoose = require('mongoose');

let isConnecting = false;
let connectionPromise = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';

const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  bufferCommands: false,
};

function connectWithRetry(retryCount = 0, maxRetries = 10) {
  return mongoose.connect(MONGODB_URI, mongooseOptions).catch((err) => {
    const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
    console.error(`MongoDB connection failed (attempt ${retryCount + 1}/${maxRetries}):`, err.message);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying in ${waitTime}ms...`);
      return new Promise((resolve) => setTimeout(resolve, waitTime))
        .then(() => connectWithRetry(retryCount + 1, maxRetries));
    }
    throw err;
  });
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  isConnecting = true;
  connectionPromise = connectWithRetry();

  try {
    const conn = await connectionPromise;
    isConnecting = false;
    console.log('MongoDB connected successfully');
    return conn;
  } catch (err) {
    isConnecting = false;
    connectionPromise = null;
    console.error('MongoDB connection failed after all retries:', err.message);
    throw err;
  }
}

function setupConnectionListeners() {
  mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
    if (!isConnecting) {
      console.log('Attempting to reconnect...');
      connectDB().catch((err) => {
        console.error('Reconnection failed:', err.message);
      });
    }
  });

  mongoose.connection.on('reconnected', () => {
    console.log('Mongoose reconnected to MongoDB');
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  });
}

async function ensureConnection() {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
  return mongoose.connection;
}

function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    readyState: mongoose.connection.readyState,
    status: states[mongoose.connection.readyState] || 'unknown',
    connected: mongoose.connection.readyState === 1,
  };
}

setupConnectionListeners();

module.exports = {
  connectDB,
  ensureConnection,
  getConnectionStatus,
  mongoose,
};