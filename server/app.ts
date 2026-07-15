import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import errorHandler from './middleware/errorHandler';

// Routes
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

// The socket.io instance is injected at runtime by server.ts. The request
// middleware reads it lazily so it is available even though io is created
// after the app (it needs the http server, which wraps the app).
let ioRef: any = null;
export const setIo = (io: any) => {
  ioRef = io;
};

// Build and return the Express app. Used by server.ts (with a live io) and by
// the test suite (without one).
export function createApp() {
  const app = express();

  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Serve uploaded files (face images, memories, etc.)
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Make io accessible to controllers (may be null under tests).
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.io = ioRef;
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
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
