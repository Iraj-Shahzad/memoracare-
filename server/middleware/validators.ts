import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Register validation rules
export const registerValidation = [
  body('name', 'Name is required').trim().notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please provide a password with 6 or more characters').isLength({ min: 6 }),
  body('phone', 'Phone number is required').trim().notEmpty(),
  body('role', 'Role must be one of: patient, caregiver, admin').isIn(['patient', 'caregiver', 'admin']),
];

// Login validation rules
export const loginValidation = [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists(),
];

// Medication validation rules
export const medicationValidation = [
  body('name', 'Medication name is required').trim().notEmpty(),
  body('dosage', 'Dosage is required').trim().notEmpty(),
  body('patient', 'Patient ID is required').trim().notEmpty(),
];

// Routine validation rules
export const routineValidation = [
  body('activityName', 'Activity name is required').trim().notEmpty(),
  body('patient', 'Patient ID is required').trim().notEmpty(),
];

// Validation error handler middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};
