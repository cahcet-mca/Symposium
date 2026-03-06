const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...'.yellow);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    console.log(`📁 Database: ${conn.connection.name}`.green);
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`.red.underline.bold);
    console.error('Please check your MONGODB_URI environment variable'.yellow);
    throw error; // Re-throw to handle in server.js
  }
};

module.exports = connectDB;