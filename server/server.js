const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const colors = require('colors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize app
const app = express();

// Body parser with increased limit for screenshots
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Get local IP address
const getLocalIP = () => {
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
  return 'localhost';
};

const LOCAL_IP = getLocalIP();

// Enable CORS - Allow all origins for network access
app.use(cors({
  origin: '*', // Allow all origins for network access
  credentials: true
}));

// Or more specifically, allow multiple origins:
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    `http://${LOCAL_IP}:3000`,
    'http://10.64.217.53:3000' // Your specific IP
  ],
  credentials: true
}));

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

// Listen on all network interfaces (0.0.0.0)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running!`.green.bold);
  console.log(`📡 Local: http://localhost:${PORT}`.cyan);
  console.log(`📱 Frontend URL: http://10.64.217.53:3000`.yellow);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Error: ${err.message}`.red);
  server.close(() => process.exit(1));
});

// Allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://tribyte-symposium.netlify.app',
  'https://tribyte-symposium.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());
