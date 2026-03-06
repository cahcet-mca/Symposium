const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const colors = require('colors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Validate critical environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables!'.red.bold);
  console.error('Please check your .env file or environment variables.'.yellow);
  process.exit(1);
}

console.log('🔍 MongoDB URI found:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':****@'));

// Connect to database with better error handling
const connectWithRetry = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB Connected Successfully!'.green.bold);
  } catch (err) {
    console.error('❌ MongoDB connection failed:'.red.bold, err.message);
    console.log('🔄 Retrying in 5 seconds...'.yellow);
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Initialize app
const app = express();

// Body parser with increased limit for screenshots
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Get local IP address
const getLocalIP = () => {
  try {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (error) {
    console.log('Could not determine local IP');
  }
  return 'localhost';
};

const LOCAL_IP = getLocalIP();

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  `http://${LOCAL_IP}:3000`,
  'https://tecnorendezvous-symposium.netlify.app',
  'https://symposium-veyj.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn(`Blocked request from origin: ${origin}`);
      return callback(null, false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV
  });
});

// Mount routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/event-registers', require('./routes/eventRegisterRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack.red);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;

// Listen on all network interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running!`.green.bold);
  console.log(`📡 Port: ${PORT}`.cyan);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`.cyan);
  console.log(`📱 Local: http://localhost:${PORT}`.cyan);
  if (LOCAL_IP !== 'localhost') {
    console.log(`📱 Network: http://${LOCAL_IP}:${PORT}`.cyan);
  }
  
  // Check MongoDB connection status after server starts
  setTimeout(() => {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`💾 MongoDB Status: ${states[state] || 'unknown'}`.cyan);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection: ${err.message}`.red);
  // Don't exit the process, just log the error
});

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:'.red, err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected'.yellow);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected'.green);
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination'.cyan);
  process.exit(0);
});
