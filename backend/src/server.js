  const dns = require('node:dns');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ quiet: true });
const createApp = require('./app');
const { connectDB } = require('./config/db');

const { MONGODB_URI, FRONTEND_URL, PORT = 5000 } = process.env;

if (!MONGODB_URI) {
  console.error('Missing required environment variable: MONGODB_URI (see .env.example)');
  process.exit(1);
}
if (!FRONTEND_URL) {
  console.error('Missing required environment variable: FRONTEND_URL (see .env.example)');
  process.exit(1);
}

// FRONTEND_URL may hold several comma-separated origins (e.g. local + deployed).
const allowedOrigins = FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);

connectDB(MONGODB_URI)
  .then(() => {
    createApp(allowedOrigins).listen(PORT, () => console.log(`API listening on port ${PORT}`));
  })
  .catch((err) => {
    // err.message can contain host details but not the password; still keep it short.
     console.error('MongoDB connection failed:', err.name, '-', err.message);
    process.exit(1);
  });
