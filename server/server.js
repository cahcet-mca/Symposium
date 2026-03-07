const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const colors = require('colors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Import middleware
const { checkRegistrationsOpen } = require('./middleware/registrationMiddleware');

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
  'https://tecnorendezous.netlify.app',
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

// Public settings endpoint (no auth required for checking if registrations are open)
app.get('/api/admin/settings', async (req, res) => {
  try {
    const SystemSettings = require('./models/SystemSettings');
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Apply registration check middleware to all payment and registration routes
// This ensures users cannot access payment/registration pages when registrations are closed
app.use('/api/payments/verify', checkRegistrationsOpen);
app.use('/api/payments/my-registrations', checkRegistrationsOpen);
app.use('/api/registrations/myregistrations', checkRegistrationsOpen);
app.use('/api/registrations/check-conflict', checkRegistrationsOpen);
app.use('/api/registrations/check-registered', checkRegistrationsOpen);
app.use('/api/registrations/count', checkRegistrationsOpen);

// Mount routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/event-registers', require('./routes/eventRegisterRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack.red);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed',
      origin: req.headers.origin
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
  
  // Show allowed origins
  console.log(`\n🔒 Allowed Origins:`.yellow);
  allowedOrigins.forEach(origin => {
    console.log(`   - ${origin}`.cyan);
  });
  
  // Check MongoDB connection status after server starts
  setTimeout(() => {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`\n💾 MongoDB Status: ${states[state] || 'unknown'}`.cyan);
    
    if (state === 1) {
      console.log(`   Database: ${mongoose.connection.name}`.green);
      console.log(`   Host: ${mongoose.connection.host}`.green);
    }
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection: ${err.message}`.red);
  // Don't exit the process, just log the error
  console.log(err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`❌ Uncaught Exception: ${err.message}`.red);
  console.log(err);
  // Exit gracefully
  server.close(() => {
    process.exit(1);
  });
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...'.yellow);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed'.green);
    
    server.close(() => {
      console.log('✅ Server closed'.green);
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Error during shutdown:'.red, err);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...'.yellow);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed'.green);
    
    server.close(() => {
      console.log('✅ Server closed'.green);
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Error during shutdown:'.red, err);
    process.exit(1);
  }
});

module.exports = app;