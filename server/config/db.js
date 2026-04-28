const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...'.yellow);
    console.log('📊 Connection string:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':****@'));
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    console.log(`📁 Database: ${conn.connection.name}`.green);
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`.red.underline.bold);
    
    // Provide specific error messages
    if (error.message.includes('bad auth')) {
      console.error('🔑 Authentication failed - Check username and password'.yellow);
      console.error('   Make sure special characters in password are URL encoded'.yellow);
      console.error('   Example: password@123 → password%40123'.yellow);
    } else if (error.message.includes('getaddrinfo')) {
      console.error('🌐 Network error - Check cluster hostname'.yellow);
    } else if (error.message.includes('timed out')) {
      console.error('⏱️ Connection timeout - Check your network or MongoDB Atlas IP whitelist'.yellow);
      console.error('   Add your current IP to MongoDB Atlas network access'.yellow);
    }
    
    throw error;
  }
};

module.exports = connectDB;