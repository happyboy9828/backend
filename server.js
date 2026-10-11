require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const trackRoutes = require('./routes/track');
const metricsRoutes = require('./routes/metrics');
const analyticsRoutes = require('./routes/analytics');
const sessionsRoutes = require('./routes/sessions');
const pagesRoutes = require('./routes/pages');

const app = express();
const PORT = process.env.PORT || 8080;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';

app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('MongoDB connection established'));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the MERN Backend API' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/status', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  let dbName = {};
  let collections = {};

  if (dbStatus === 1 && mongoose.connection.db) {
    dbName = { name: mongoose.connection.db.databaseName };
    mongoose.connection.db
      .listCollections()
      .toArray()
      .then((cols) => {
        cols.forEach((col) => {
          collections[col.name] = {};
        });
        res.json({
          database: statusMap[dbStatus] || 'unknown',
          readyState: dbStatus,
          connected: dbStatus === 1,
          dbName,
          collections,
        });
      })
      .catch(() => {
        res.json({
          database: statusMap[dbStatus] || 'unknown',
          readyState: dbStatus,
          connected: dbStatus === 1,
          dbName: {},
          collections: {},
        });
      });
  } else {
    res.json({
      database: statusMap[dbStatus] || 'unknown',
      readyState: dbStatus,
      connected: dbStatus === 1,
      dbName: {},
      collections: {},
    });
  }
});

app.use('/api/track', trackRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/sessions', authMiddleware, sessionsRoutes);
app.use('/api/pages', authMiddleware, pagesRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
