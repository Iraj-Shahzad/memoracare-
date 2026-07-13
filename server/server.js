require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');

// Import database connection
const connectDB = require('./config/db');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Serve uploaded files (face images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io setup for real-time notifications
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Real-time notification handlers can be added here
  socket.on('join_room', (data) => {
    socket.join(data.patientId);
    console.log(`User joined room: ${data.patientId}`);
  });

  socket.on('leave_room', (data) => {
    socket.leave(data.patientId);
    console.log(`User left room: ${data.patientId}`);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/medications', require('./routes/medicationRoutes'));
app.use('/api/routines', require('./routes/routineRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/face-recognition', require('./routes/faceRecognitionRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/caregiver', require('./routes/caregiverRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MemoryCare server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`MemoryCare server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  // Start the reminder / missed-dose scheduler (node-cron)
  require('./services/reminderScheduler').start(io);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

module.exports = server;
