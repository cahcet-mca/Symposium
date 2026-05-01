# TECNO RENDEZVOUS 2026 - National Level Technical Symposium

🎯 **Think Big • Act Smart • Win Together**

## 📋 About
TECNO RENDEZVOUS is a national-level technical symposium organized by C. Abdul Hakeem College of Engineering and Technology, featuring 15+ exciting events across Technical and Non-Technical categories. This comprehensive event management platform allows students to register for events, make UPI payments, form teams, track their registrations in real-time, and download event tickets.

**Date:** 26th July 2026  
**Venue:** C. Abdul Hakeem College of Engineering and Technology, Melvisharam

## ✨ Features

### For Participants
- 🔐 **User Authentication** - Secure registration and login with JWT
- 📅 **Event Discovery** - Browse and filter events by category and type
- 👥 **Team Management** - Create teams for group events with multiple participants
- 💳 **UPI Payment Integration** - Pay securely via UPI with QR code scanning
- 📊 **Real-time Registration Tracking** - Live updates on available spots
- 📋 **Dashboard** - Track registration status (Pending/Accepted/Rejected)
- 📎 **Ticket Download** - Generate and download event tickets as HTML
- ⏰ **Time Conflict Detection** - Prevents overlapping event registrations

### For Administrators
- 🔒 **Secure Admin Panel** - Dedicated admin login with role-based access
- ✅ **Registration Management** - Accept or reject participant registrations
- 📊 **Real-time Statistics** - View pending/accepted/rejected counts and revenue
- 🔄 **Global Registration Toggle** - Open/close registrations system-wide
- 📥 **Excel Export** - Download complete participant data as Excel file
- 👁️ **Transaction View** - View all payments with transaction details
- 📈 **Revenue Tracking** - Track total collection from verified registrations

### Technical Features
- 🚀 **Real-time Database Sync** - Automatic sync of registration counts
- 📱 **Fully Responsive Design** - Works seamlessly on mobile, tablet, and desktop
- 🎨 **Gold-themed UI** - Premium gradient-based user interface
- 🔄 **Auto-sync** - Registration counts update in real-time
- 🛡️ **Protected Routes** - Secure access control for authenticated users
- 📝 **Comprehensive Logging** - Detailed server-side logging for debugging

## 🎪 Events Lineup

### Technical Events
| Event Name | Sub Event | Type | Team Size | Fee |
|------------|-----------|------|-----------|-----|
| Presento | Paper Presentation | Individual/Team | 1-2 | ₹50 |
| Code-de-Code | Coding & Debugging | Individual | 1 | ₹50 |
| Mega Mind | Tech Quiz | Team | 2 | ₹50 |
| Adu Marketa | AD-Making | Team | 2-3 | ₹50 |
| Web Blitz | Web Designing | Team | 2 | ₹50 |
| Posterno | Poster Presentation | Individual/Team | 1-2 | ₹50 |

### Non-Technical Events
| Event Name | Sub Event | Type | Team Size | Fee |
|------------|-----------|------|-----------|-----|
| Picky Clue | Connections | Team | 2 | ₹50 |
| Pirates Club | Treasure Hunt | Team | 4 | ₹50 |
| Food Feast | Cooking Without Fire | Individual | 1 | ₹50 |
| War Feast | Free Fire | Team | 2-4 | ₹50 |
| War Feast | BGMI | Team | 2-4 | ₹50 |
| Shutter Test | Photography | Individual | 1 | ₹50 |
| Flicker | Short Film | Team | 2-5 | ₹50 |
| Garry Chess | Chess Tournament | Individual | 1 | ₹50 |
| Art | Drawing Competition | Individual | 1 | ₹50 |

## 🛠️ Tech Stack

### Frontend

React 18.2.0 - UI Framework
React Router DOM 6.10 - Navigation and routing
Axios 1.3.5 - HTTP client for API calls
JSPDF 4.2.0 - PDF generation for tickets
XLSX 0.18.5 - Excel export functionality
CSS3 - Custom styling with gradients

### Backend

Node.js - JavaScript runtime
Express 4.18.2 - Web framework
MongoDB 7.0 - NoSQL database
Mongoose 7.0.3 - MongoDB ODM
JWT 9.0.0 - Authentication tokens
bcryptjs 2.4.3 - Password hashing
Nodemailer 6.9.1 - Email notifications


## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Git
- npm or yarn package manager

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/tecno_rendezvous.git
cd tecno_rendezvous

### Step 2: Backend Setup
cd backend
npm install
cp .env.example .env
# Edit .env with your values (MongoDB URI, JWT secret, etc.)
npm run seed  # Seed the database with events
npm run dev   # Start development server

### Step 3: Frontend Setup
cd frontend
npm install
cp .env.example .env
# Edit .env with your backend URL
npm start     # Start development server

### Step 4: Access the Application
Frontend: http://localhost:3000
Backend API: http://localhost:5000
Admin Login: http://localhost:3000/admin/login

🔐 Environment Variables
# Backend (.env)
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tecno_rendezvous
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000/api

📚 API Documentation
# Authentication Endpoints
Method	Endpoint	            Description	        Access
POST	/api/auth/register	    User registration	Public
POST	/api/auth/login	        User login	        Public
GET	    /api/auth/profile	    Get user profile	Private
PUT	    /api/auth/profile	    Update profile	    Private

# Event Endpoints
Method	Endpoint	                Description	                            Access
GET	    /api/events	                Get all events	                        Public
GET	    /api/events/:id	            Get single event	                    Public
GET	    /api/events/:id/with-count	Get event with real registration count	Public
POST	/api/events	                Create event	                        Admin

# Registration Endpoints
Method	Endpoint	                        Description	                Access
GET	    /api/registrations/myregistrations	Get user registrations	    Private
POST	/api/registrations/check-conflict	Check time conflicts	    Private
POST	/api/registrations/check-registered	Check registration status	Private
GET	    /api/registrations/count/:eventId	Get registration count	    Public

# Payment Endpoints
Method	Endpoint	                    Description	        Access
POST	/api/payments/verify	        Verify UPI payment	Private
GET	    /api/payments/my-registrations	Get user payments	Private

# Admin Endpoints
Method	Endpoint	                                Description	                Access
POST	/api/admin/login	                        Admin login	                Public
GET	    /api/admin/registrations	                Get all registrations	    Admin
PUT	    /api/admin/registrations/:id/status	        Update registration status	Admin
GET	    /api/admin/stats	                        Get statistics	            Admin
PUT	    /api/admin/settings/toggle-registrations	Toggle registrations	    Admin

👥 User Guide
# Registration Process
1. Create Account - Sign up with your details at /register
2. Login - Access your account at /login
3. Browse Events - Explore all events at /events
4. Register for Event - Click "Register Now" on any event
5. Make Payment:
    Scan QR code or copy UPI ID
    Pay the exact amount
    Enter 12-digit transaction ID
    Upload payment screenshot
6. Wait for Approval - Admin verifies your payment
7. Track Status - Check registration status in Dashboard
8. Download Ticket - Get your ticket after approval

# Dashboard Features
View all registrations with status
Download tickets for accepted registrations
Update profile information
Track payment history

👑 Admin Guide
# Admin Login
URL: /admin/login
Credentials:
    ID: ''
    Password: ''

# Admin Dashboard Features
Registration Management
    Pending Tab: Review and accept/reject new registrations
    Accepted Tab: View all verified registrations
    Rejected Tab: View rejected registrations
    Participants Tab: Export participant data to Excel

Statistics
    Total registrations count
    Pending/Accepted/Rejected breakdown
    Total revenue from verified registrations
    Event-wise registration statistics

System Controls
    Registration Toggle: Open/close registrations globally
    Excel Export: Download complete participant list

🌐 Deployment
# Deploy Backend on Render
1. Create account at render.com
2. Connect your GitHub repository
3. Create new Web Service with:
    Root Directory: backend
    Build Command: npm install
    Start Command: npm start
4. Add environment variables
5. Deploy

# Deploy Frontend on Netlify
1. Build the frontend:
cd frontend
npm run build

2. Deploy to Netlify by dragging the build folder
3. Add environment variable:
REACT_APP_API_URL = your-render-backend-url/api

📝 Database Schema
# User Model
{
  name: String,
  email: String,
  password: String (hashed),
  college: String,
  department: String,
  year: Number,
  phone: String,
  role: String ['participant', 'admin']
}

# Event Model
{
  name: String,
  subEventName: String,
  coordinatorName: String,
  coordinatorPhone: String,
  category: String ['Technical','Non-Technical'],
  type: String ['Individual','Team'],
  description: String,
  fee: Number,
  minTeamSize: Number,
  maxTeamSize: Number,
  startTime: String,
  endTime: String,
  venue: String,
  requirements:[String],
  prizes:{
    first: String,
    second: String,
    third: String
    },
  maxParticipants: Number,
  registeredCount: Number,
  status: String ['Upcoming','Ongoing','Completed']
}

# Registration Model
{
  event: ObjectId,
  eventName: String,
  user: ObjectId,
  teamName: String,
  teamSize: Number,
  participants: [{
    name: String,
    email: String,
    phone: String
  }],
  totalAmount: Number,
  transactionId: String,
  paymentScreenshot: String,
  paymentStatus: String ['pending','verified','rejected'],
  registrationStatus: String ['pending','confirmed','cancelled']
}

🤝 Contributing
1. Fork the repository
2. Create a feature branch (git checkout -b feature/AmazingFeature)
3. Commit changes (git commit -m 'Add AmazingFeature')
4. Push to branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

# Coding Standards
    Use ESLint for code linting
    Follow React best practices
    Write meaningful commit messages
    Add comments for complex logic

📄 License
This project is proprietary and confidential. Unauthorized copying, distribution, or use of this software is strictly prohibited.

Copyright © 2026 C. Abdul Hakeem College of Engineering and Technology. All rights reserved.

👨‍💻 Team
Organizer: C. Abdul Hakeem College of Engineering and Technology
Department: Master of Computer Applications (MCA)
Developers: Student Development Team
    DINESH M
    GOKUL T
    ABUL KALAM A
    GOKUL T
    THIRUMALAIVASAN K
    VIGNESH V
    MOHAMMED SAAD T M

📞 Contact
# For queries and support:
    📧 Email: support@tecno_rendezvous.com
    🌐 Website: https://tecno_rendezvous.com
    📍 Address: Melvisharam, Ranipet District, Tamil Nadu - 632509
    📱 Phone: +91 98765 43210
