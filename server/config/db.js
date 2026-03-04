const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    // Use TriByte as database name
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    console.log(`📁 Database: ${conn.connection.name}`.green);
    
    return conn;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

module.exports = connectDB;