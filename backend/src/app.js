const express = require('express');
const cors = require('cors');
const requirementRoutes = require('./routes/requirementRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/db');

// allowedOrigins: explicit allowlist (CORS is a browser rule, not authentication).
function createApp(allowedOrigins = []) {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors({
    origin(origin, cb) {
      // No Origin header = curl / server-to-server / same-origin: not a browser CORS request.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
  }));
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/health', (req, res) => {
    const ready = db.isDbReady();
    res.status(ready ? 200 : 503).json({
      success: ready,
      status: ready ? 'ok' : 'degraded',
      database: ready ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    });
  });

  app.use('/api/requirements', requirementRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
