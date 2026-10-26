const mongoose = require('mongoose');

// Fail fast instead of queueing queries forever when the database is down.
mongoose.set('bufferCommands', false);

async function connectDB(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');
}

const isDbReady = () => mongoose.connection.readyState === 1;

module.exports = { connectDB, isDbReady };
