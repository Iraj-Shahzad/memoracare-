/**
 * ERROR HANDLER MIDDLEWARE — the single Express error sink (4-arg signature).
 *
 * Key concepts: registered last in app.ts so any next(err) lands here; translates common
 * failures into clean HTTP codes — Mongoose CastError -> 404, duplicate key 11000 -> 400,
 * ValidationError -> 400 (joined field messages), JWT errors -> 401 — and falls back to 500.
 * The raw stack is only exposed when NODE_ENV === 'development', so production never leaks internals.
 * Viva line: "One central handler turns library-specific errors into consistent, safe JSON responses."
 */
import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error: any = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = `Duplicate field value entered`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    // Only leak the stack trace in development — never to production clients.
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
