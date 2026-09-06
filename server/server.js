const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// ============================================
// VALIDATE REQUIRED ENVIRONMENT VARIABLES
// ============================================

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_ID', 'ADMIN_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('\n❌ Missing required environment variables:'.red.bold);
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`.yellow);
  });
  console.error('\n⚠️  Please set these variables in your .env file\n'.red);
  
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
} else {
  console.log('\n✅ All required environment variables are set'.green);
}

// Validate MongoDB URI
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables!'.red.bold);
  process.exit(1);
}

console.log('🔍 MongoDB URI found:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':****@'));

// ============================================
// CONNECT TO DATABASE
// ============================================

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

// ============================================
// INITIALIZE APP
// ============================================

const app = express();

// Body parser with increased limit for screenshots
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// SERVE STATIC EVENT IMAGES
// ============================================

const eventImagesPath = path.join(__dirname, '..', 'event-images');

if (!fs.existsSync(eventImagesPath)) {
  fs.mkdirSync(eventImagesPath, { recursive: true });
  console.log('📁 Created event-images directory'.green);
}

app.use('/event-images', express.static(eventImagesPath));
console.log(`📁 Serving event images from: ${eventImagesPath}`.cyan);

// ============================================
// GET LOCAL IP ADDRESS
// ============================================

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

// ============================================
// CORS CONFIGURATION - Supports both Client & Admin
// ============================================

const allowedOrigins = [
  // Client (User App) - Development
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  `http://${LOCAL_IP}:3000`,
  
  // Admin App - Development
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  `http://${LOCAL_IP}:3001`,
  
  // Client (User App) - Production
  'https://techno-rendezvous.netlify.app',
  
  // Admin App - Production
  'https://tecnorendezous-admin.netlify.app',
  'https://tecno-rendezvous-admin.netlify.app',
  
  // Backend - Production
  'https://symposium-veyj.onrender.com',
  
  // Wildcards for Netlify
  'https://*.netlify.app',
  'https://*.vercel.app',
  'https://*.render.com'
];

// CORS Configuration Function
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin matches any allowed pattern
    const allowed = allowedOrigins.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return pattern === origin;
    });
    
    if (allowed) {
      return callback(null, true);
    } else {
      // In production, reject unlisted origins
      if (process.env.NODE_ENV === 'production') {
        console.warn(`🚫 CORS blocked: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      }
      // In development, allow all for testing
      console.warn(`⚠️ CORS allowed (dev mode): ${origin}`);
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// ============================================
// LOGGING MIDDLEWARE
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method.padEnd(6);
    const status = res.statusCode;
    const statusColor = status >= 400 ? 'red' : status >= 300 ? 'yellow' : 'green';
    console.log(`${method} ${req.originalUrl} ${String(status)[statusColor]} ${duration}ms`.cyan);
  });
  next();
});

// ============================================
// PUBLIC SETTINGS ENDPOINT (No Auth Required)
// ============================================

app.get('/api/settings/registrations-status', async (req, res) => {
  try {
    const SystemSettings = require('./models/SystemSettings');
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      data: {
        registrationsOpen: settings.registrationsOpen
      }
    });
  } catch (error) {
    console.error('Error getting public settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// SYMPOSIUM SETTINGS - Public Endpoint
// ============================================

app.get('/api/symposium/settings', async (req, res) => {
  try {
    const SymposiumSettings = require('./models/SymposiumSettings');
    const settings = await SymposiumSettings.getSettings();
    
    res.json({
      success: true,
      data: {
        symposiumDate: settings.symposiumDate,
        formattedDate: settings.getFormattedDate(),
        symposiumName: settings.symposiumName,
        venue: settings.venue,
        venueDetails: settings.venueDetails,
        upiId: settings.upiId,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Error getting symposium settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// APPLY REGISTRATION CHECK MIDDLEWARE
// ============================================

// Import registration middleware
const { checkRegistrationsOpen } = require('./middleware/registrationMiddleware');

// Only block WRITE operations when registrations are closed
// READ operations (GET) are always allowed to view existing data

// Payment verification (POST) - Block when closed
app.use('/api/payments/verify', checkRegistrationsOpen);

// Check conflict (POST) - Block when closed (can't register for new events)
app.use('/api/registrations/check-conflict', checkRegistrationsOpen);

// All GET routes are automatically allowed

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎯 TECHNO RENDEZVOUS API is running',
    status: 'online',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    allowedOrigins: allowedOrigins,
    endpoints: {
      events: '/api/events',
      auth: '/api/auth',
      registrations: '/api/registrations',
      payments: '/api/payments',
      admin: '/api/admin',
      health: '/health',
      settings: '/api/settings/registrations-status',
      symposium: '/api/symposium/settings',
      images: '/event-images/:filename'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// ============================================
// MOUNT ROUTES
// ============================================

// Import routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const symposiumRoutes = require('./routes/symposiumRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/symposium', symposiumRoutes);

// ============================================
// 404 HANDLER
// ============================================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Error:'.red, err.stack);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed',
      origin: req.headers.origin
    });
  }
  
  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}. Please use a different value.`
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please login again.'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

// Listen on all network interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`.green);
  console.log(`🚀 TECHNO RENDEZVOUS BACKEND SERVER`.green.bold);
  console.log(`${'='.repeat(60)}`.green);
  console.log(`📡 Port: ${PORT}`.cyan);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`.cyan);
  console.log(`📱 Local: http://localhost:${PORT}`.cyan);
  if (LOCAL_IP !== 'localhost') {
    console.log(`📱 Network: http://${LOCAL_IP}:${PORT}`.cyan);
  }
  console.log(`🖼️  Image URL: http://localhost:${PORT}/event-images/`.cyan);
  console.log(`${'='.repeat(60)}`.green);
  
  // Show allowed origins
  console.log(`\n🔒 Allowed Origins:`.yellow);
  allowedOrigins.forEach(origin => {
    console.log(`   - ${origin}`.cyan);
  });
  console.log(`${'='.repeat(60)}\n`.green);
  
  // Check MongoDB connection status after server starts
  setTimeout(() => {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`💾 MongoDB Status: ${states[state] || 'unknown'}`.cyan);
    
    if (state === 1) {
      console.log(`   Database: ${mongoose.connection.name}`.green);
      console.log(`   Host: ${mongoose.connection.host}`.green);
    }
    console.log(`${'='.repeat(60)}\n`.green);
  }, 1000);
});

// ============================================
// HANDLE UNHANDLED PROMISE REJECTIONS
// ============================================

process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection: ${err.message}`.red);
  console.log(err.stack);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`❌ Uncaught Exception: ${err.message}`.red);
  console.log(err.stack);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// ============================================
// HANDLE MongoDB CONNECTION EVENTS
// ============================================

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:'.red, err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected'.yellow);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected'.green);
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected'.green);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...'.yellow);
  
  try {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed'.green);
    
    // Close HTTP server
    server.close(() => {
      console.log('✅ Server closed'.green);
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Error during shutdown:'.red, err);
    process.exit(1);
  }
};

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', gracefulShutdown);

// Handle SIGTERM (kill command)
process.on('SIGTERM', gracefulShutdown);

// Handle SIGQUIT
process.on('SIGQUIT', gracefulShutdown);

// ============================================
// EXPORT APP (for testing)
// ============================================

module.exports = app;