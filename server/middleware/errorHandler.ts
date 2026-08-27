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

  // Mongoose bad ObjectId. Only a failed _id cast means "no such record" — a bad
  // value in any other field is a bad request, and answering that with 404
  // "Resource not found" sends the caller looking for the wrong problem.
  if (err.name === 'CastError') {
    if (err.path === '_id' || err.kind === 'ObjectId') {
      error = { message: 'Resource not found', statusCode: 404 };
    } else {
      error = { message: `Invalid value for ${err.path || 'a field'}`, statusCode: 400 };
    }
  }

  // Multer upload failures (file too large, wrong type). Without this they fall
  // through to the 500 branch, so a photo over the limit looked like a crash
  // instead of telling the user to pick a smaller image.
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'That image is too large. Please choose a smaller one.'
      : `Upload error: ${err.message}`;
    error = { message, statusCode: 400 };
  }

  if (typeof err.message === 'string' && err.message.startsWith('Only image files')) {
    error = { message: err.message, statusCode: 400 };
  }

  // Body larger than the express.json limit.
  if (err.type === 'entity.too.large') {
    error = { message: 'That request is too large.', statusCode: 413 };
  }

  // Mongoose duplicate key. Name the field: "Duplicate field value entered"
  // tells the user nothing about which value to change.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0];
    const message =
      field === 'cnic' ? 'That CNIC is already registered to another patient.'
      : field === 'email' ? 'That email is already registered.'
      : 'That value is already in use.';
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
