import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';

// Import database connection
import connectDB from './config/db';

// Import middleware
import errorHandler from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import patientRoutes from './routes/patientRoutes';
import medicationRoutes from './routes/medicationRoutes';
import routineRoutes from './routes/routineRoutes';
import chatRoutes from './routes/chatRoutes';
import faceRecognitionRoutes from './routes/faceRecognitionRoutes';
import alertRoutes from './routes/alertRoutes';
import reportRoutes from './routes/reportRoutes';
import adminRoutes from './routes/adminRoutes';
import caregiverRoutes from './routes/caregiverRoutes';
import contactRoutes from './routes/contactRoutes';
import memoryRoutes from './routes/memoryRoutes';

import { start as startReminderScheduler } from './services/reminderScheduler';

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
const io = new Server(server, {
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
  socket.on('join_room', (data: { patientId: string }) => {
    socket.join(data.patientId);
    console.log(`User joined room: ${data.patientId}`);
  });

  socket.on('leave_room', (data: { patientId: string }) => {
    socket.leave(data.patientId);
    console.log(`User left room: ${data.patientId}`);
  });
});

// Make io accessible to routes
app.use((req: Request, res: Response, next: NextFunction) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/face-recognition', faceRecognitionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/caregiver', caregiverRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/memories', memoryRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'MemoryCare server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
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
  startReminderScheduler(io);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

export default server;
