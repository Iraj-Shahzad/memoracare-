import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';

import connectDB from './config/db';
import { createApp, setIo } from './app';
import { start as startReminderScheduler } from './services/reminderScheduler';

// Connect to MongoDB
connectDB();

// Build the Express app and wrap it in an HTTP server for socket.io
const app = createApp();
const server = http.createServer(app);

// Socket.io setup for real-time notifications
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
});
setIo(io);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('join_room', (data: { patientId: string }) => {
    socket.join(data.patientId);
    console.log(`User joined room: ${data.patientId}`);
  });

  socket.on('leave_room', (data: { patientId: string }) => {
    socket.leave(data.patientId);
    console.log(`User left room: ${data.patientId}`);
  });
});

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
