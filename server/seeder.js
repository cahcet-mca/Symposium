const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const Event = require('./models/Event');
const User = require('./models/User');
const Registration = require('./models/Registration');
const Transaction = require('./models/Transaction');
const connectDB = require('./config/db');

dotenv.config();

const events = [
  {
    name: "Paper Presentation",
    category: "Technical",
    type: "Individual",
    description: "Share your groundbreaking research concepts and practical technical solutions with experienced industry leaders and scholars. Highlight your analytical abilities and receive constructive insights and expert guidance to refine your work.",
    fee: 50,
    minTeamSize: 1,
    maxTeamSize: 2,
    startTime: "10:00 AM",
    endTime: "12:30 PM",
    venue: "Will be intimated on day of event",
    requirements: ["Research Paper (4-6 pages)", "Presentation Slides", "Student ID Card", "3 Hard Copies"],
    prizes: {
      first: "₹3,000 + Certificate",
      second: "₹2,000 + Certificate",
      third: "₹1,000 + Certificate"
    },
    maxParticipants: 30,
    status: "Upcoming"
  },
  {
    name: "Web Design",
    category: "Technical",
    type: "Team",
    description: "Design and develop responsive websites that combine functionality with aesthetic appeal. Showcase your web development skills and creativity in this exciting competition.",
    fee: 50,
    minTeamSize: 2,
    maxTeamSize: 2,
    startTime: "11:00 AM",
    endTime: "12:00 PM",
    venue: "Computer Lab - 3rd Floor",
    requirements: ["Personal Laptop", "VS Code/Editor", "Student ID Card"],
    prizes: {
      first: "₹3,000 + Certificate",
      second: "₹2,000 + Certificate",
      third: "₹1,000 + Certificate"
    },
    maxParticipants: 25,
    status: "Upcoming"
  },
  {
    name: "Quiz",
    category: "Technical",
    type: "Team",
    description: "Create and build dynamic, mobile-friendly websites that blend seamless performance with visual elegance. Demonstrate your coding expertise and innovative design thinking in this thrilling web development challenge.",
    fee: 50,
    minTeamSize: 2,
    maxTeamSize: 2,
    startTime: "10:00 AM",
    endTime: "11:30 AM",
    venue: "Seminar Hall A",
    requirements: ["Student ID Card"],
    prizes: {
      first: "₹3,000 + Certificate",
      second: "₹2,000 + Certificate",
      third: "₹1,000 + Certificate"
    },
    maxParticipants: 40,
    status: "Upcoming"
  },
  {
    name: "Photography",
    category: "Non-Technical",
    type: "Individual",
    description: "Frame the spirit of imagination through your camera. Exhibit your photographic talent in this creative contest centered on the theme “Innovation in Everyday Life”.",
    fee: 50,
    minTeamSize: 1,
    maxTeamSize: 1,
    startTime: "2:00 PM",
    endTime: "3:00 PM",
    venue: "Campus Grounds",
    requirements: ["DSLR/Mirrorless Camera", "Memory Card", "Student ID Card"],
    prizes: {
      first: "₹3,000 + Certificate",
      second: "₹2,000 + Certificate",
      third: "₹1,000 + Certificate"
    },
    maxParticipants: 30,
    status: "Upcoming"
  },
  {
    name: "Cooking Without Fire",
    category: "Non-Technical",
    type: "Individual",
    description: "Prepare tasty and inventive dishes without the use of flame or cooking appliances. Showcase your imagination and culinary talent in this fun and creative no-heat cooking challenge.",
    fee: 50,
    minTeamSize: 1,
    maxTeamSize: 1,
    startTime: "11:00 AM",
    endTime: "12:00 PM",
    venue: "Food Court",
    requirements: ["Ingredients", "Utensils", "Serving Plates", "Student ID Card"],
    prizes: {
      first: "₹3,000 + Certificate",
      second: "₹2,000 + Certificate",
      third: "₹1,000 + Certificate"
    },
    maxParticipants: 20,
    status: "Upcoming"
  },
  {
    name: "Treasure Hunt",
    category: "Non-Technical",
    type: "Team",
    description: "Set off on a thrilling journey filled with puzzles and hidden hints. Put your critical thinking and collaboration skills to the test in this action-packed campus treasure quest.",
    fee: 50,
    minTeamSize: 4,
    maxTeamSize: 4,
    startTime: "11:30 AM",
    endTime: "12:30 PM",
    venue: "College Campus",
    requirements: ["Comfortable Shoes", "Student ID Card", "Mobile Phone"],
    prizes: {
      first: "₹2,000 + Certificate",
      second: "₹1,000 + Certificate"
    },
    maxParticipants: 32,
    status: "Upcoming"
  },
  {
    name: "Short Film",
    category: "Non-Technical",
    type: "Team",
    description: "Bring powerful narratives to life through the craft of visual storytelling. Display your directing and production skills in this short film contest centered on the theme “Digital India”.",
    fee: 50,
    minTeamSize: 2,
    maxTeamSize: 4,
    startTime: "2:00 PM",
    endTime: "3:00 PM",
    venue: "Auditorium",
    requirements: ["Short Film (3-5 minutes)", "Pen Drive", "Student ID Card"],
    prizes: {
      first: "₹3,000 + Certificate",
      second: "₹2,000 + Certificate",
      third: "₹1,000 + Certificate"
    },
    maxParticipants: 20,
    status: "Upcoming"
  },
  {
    name: "Visual Design",
    category: "Non-Technical",
    type: "Team",
    description: "Craft eye-catching visual creations that convey impactful ideas. Showcase your artistic imagination through innovative digital design and creative expression.",
    fee: 50,
    minTeamSize: 2,
    maxTeamSize: 4,
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    venue: "Design Lab",
    requirements: ["Laptop", "Design Software", "Student ID Card"],
    prizes: {
      first: "₹3,000 + Certificate",
      second: "₹2,000 + Certificate",
      third: "₹1,000 + Certificate"
    },
    maxParticipants: 25,
    status: "Upcoming"
  },
  {
    name: "Connections",
    category: "Non-Technical",
    type: "Team",
    description: "Connect with peers and cultivate valuable professional connections. Engage in this dynamic networking and collaborative team-building experience.",
    fee: 50,
    minTeamSize: 2,
    maxTeamSize: 2,
    startTime: "1:30 PM",
    endTime: "3:00 PM",
    venue: "Conference Hall",
    requirements: ["Student ID Card", "Business Cards (Optional)"],
    prizes: {
      first: "₹2,000 + Certificate",
      second: "₹1,000 + Certificate"
    },
    maxParticipants: 30,
    status: "Upcoming"
  }
];

const importData = async () => {
  try {
    await connectDB();
    
    console.log('📦 Connected to MongoDB. Starting data import...'.yellow);
    
    // ✅ SAFE APPROACH: Check existing events and only add missing ones
    console.log('🔍 Checking existing events...'.cyan);
    
    const existingEvents = await Event.find();
    console.log(`📊 Found ${existingEvents.length} existing events`.cyan);
    
    if (existingEvents.length === 0) {
      // No events exist, add all
      await Event.insertMany(events);
      console.log('✅ All events imported!'.green);
    } else {
      // Check which events are missing and add only those
      let addedCount = 0;
      
      for (const eventData of events) {
        const exists = existingEvents.some(e => e.name === eventData.name);
        
        if (!exists) {
          await Event.create(eventData);
          console.log(`➕ Added missing event: ${eventData.name}`.green);
          addedCount++;
        } else {
          console.log(`⏭️ Event already exists: ${eventData.name}`.gray);
        }
      }
      
      if (addedCount === 0) {
        console.log('✨ All events already exist. No changes made.'.yellow);
      } else {
        console.log(`✅ Added ${addedCount} new events. Existing data preserved.`.green);
      }
    }
    
    // ❌ REMOVED: The data clearing code
    // await Event.deleteMany({});
    // await User.deleteMany({});
    // await Registration.deleteMany({});
    // await Transaction.deleteMany({});
    // console.log('🗑️ Existing data cleared...'.red);
    
    // Get database stats
    const stats = {
      events: await Event.countDocuments(),
      users: await User.countDocuments(),
      registrations: await Registration.countDocuments(),
      transactions: await Transaction.countDocuments()
    };
    
    console.log('\n📊 Database Statistics:'.cyan);
    console.log(`   Events: ${stats.events}`.green);
    console.log(`   Users: ${stats.users}`.green);
    console.log(`   Registrations: ${stats.registrations}`.green);
    console.log(`   Transactions: ${stats.transactions}`.green);
    
    console.log('\n✅ Data Import Completed Successfully!'.green.inverse);
    console.log('💾 All existing user data and registrations have been preserved.'.cyan);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red.inverse);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();
    
    console.log('📦 Connected to MongoDB. Starting data destruction...'.yellow);
    
    // ⚠️ This will still delete everything - use with caution
    console.log('⚠️  WARNING: This will DELETE ALL DATA!'.red.bold);
    console.log('Press Ctrl+C within 5 seconds to cancel...'.yellow);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await Event.deleteMany({});
    await User.deleteMany({});
    await Registration.deleteMany({});
    await Transaction.deleteMany({});
    
    console.log('✅ All Data Destroyed!'.red.inverse);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red.inverse);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}