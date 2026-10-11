require('dotenv').config();
const express = require('express');
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const trackRoutes = require('./routes/track');
const metricsRoutes = require('./routes/metrics');
const analyticsRoutes = require('./routes/analytics');
const sessionsRoutes = require('./routes/sessions');
const pagesRoutes = require('./routes/pages');
const { connectDB, ensureConnection, getConnectionStatus, mongoose } = require('./utils/db');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));

connectDB().catch((err) => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

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

app.get('/status', async (req, res) => {
  await ensureConnection();
  const status = getConnectionStatus();
  let dbName = {};
  let collections = {};

  if (status.connected && mongoose.connection.db) {
    dbName = { name: mongoose.connection.db.databaseName };
    try {
      const cols = await mongoose.connection.db.listCollections().toArray();
      cols.forEach((col) => {
        collections[col.name] = {};
      });
    } catch (e) {
      // Ignore collection listing errors
    }
  }

  res.json({
    ...status,
    dbName,
    collections,
  });
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
