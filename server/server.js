const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const colors = require('colors');
const connectDB = require('./config/db');

// Load env vars - IMPORTANT: This must be first
dotenv.config();

// Validate critical environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables!'.red.bold);
  console.error('Please set MONGODB_URI in your Render environment variables.'.yellow);
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not defined in environment variables!'.red.bold);
  console.error('Please set JWT_SECRET in your Render environment variables.'.yellow);
  process.exit(1);
}

// Connect to database
connectDB().catch(err => {
  console.error('❌ Failed to connect to MongoDB:'.red.bold, err.message);
  process.exit(1);
});

// Initialize app
const app = express();

// Body parser with increased limit for screenshots
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Get local IP address (for local development only)
const getLocalIP = () => {
  try {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip internal and non-IPv4 addresses
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

// Configure CORS for production
const allowedOrigins = [
  'http://localhost:3000',
  'https://tecnorendezous.netlify.app',
  'https://symposium-veyj.onrender.com',
  ...(process.env.NODE_ENV === 'production' ? [] : [`http://${LOCAL_IP}:3000`])
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

// Mount routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/event-registers', require('./routes/eventRegisterRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

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
  console.log(`💾 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`.cyan);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Error: ${err.message}`.red);
  server.close(() => process.exit(1));
});
