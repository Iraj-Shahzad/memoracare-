/**
 * VALIDATORS MIDDLEWARE — request-body validation rules via express-validator.
 *
 * Key concepts: each exported array (register/login/medication/routine) is a set of body()
 * rules chained before a controller; handleValidationErrors() reads validationResult and
 * returns 400 with the collected errors if any rule failed, otherwise calls next(). Sanitising
 * input at the edge keeps controllers clean and blocks malformed/malicious payloads early.
 * Viva line: "Validation happens as declarative middleware before any controller logic runs."
 */
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Register validation rules
// (phone and role are optional here; the controller safely defaults role to
//  "patient"/"caregiver" so public sign-up can never create an admin.)
export const registerValidation = [
  body('name', 'Name is required').trim().notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please provide a password with 6 or more characters').isLength({ min: 6 }),
  body('phone').optional().trim(),
  body('role', 'Role must be one of: patient, caregiver, admin').optional().isIn(['patient', 'caregiver', 'admin']),
];

// Login validation rules
export const loginValidation = [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists(),
];

// Shared field rules. The React forms already check these, but the API must
// enforce them too — otherwise a request sent straight to the endpoint (bypassing
// the UI) could store an unusable dosage or a time the scheduler can never match.
const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;          // 09:00, 21:30
const DOSAGE = /^\d+(\.\d+)?\s*[a-zA-Z%µ]+$/;          // 5mg, 2.5 ml, 1000IU

const timesRule = body('times')
  .optional()
  .isArray().withMessage('times must be an array')
  .bail()
  .custom((arr: any[]) => arr.every((t) => TIME_24H.test(String(t))))
  .withMessage('Each reminder time must be 24-hour HH:MM, for example 09:00');

// Medication validation rules (create: required fields must be present)
export const medicationValidation = [
  body('name', 'Medication name is required').trim().notEmpty(),
  body('dosage', 'Dosage is required').trim().notEmpty()
    .bail()
    .matches(DOSAGE).withMessage('Dosage must be a number followed by a unit, for example 5mg'),
  body('patient', 'Patient ID is required').trim().notEmpty(),
  timesRule,
];

// Medication update rules (partial update: every field optional, but if a field
// IS sent it must still be valid).
export const medicationUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Medication name cannot be empty'),
  body('dosage').optional().trim().notEmpty().withMessage('Dosage cannot be empty')
    .bail()
    .matches(DOSAGE).withMessage('Dosage must be a number followed by a unit, for example 5mg'),
  timesRule,
];

// Routine validation rules (create)
export const routineValidation = [
  body('activityName', 'Activity name is required').trim().notEmpty(),
  body('patient', 'Patient ID is required').trim().notEmpty(),
  body('startTime').optional().matches(TIME_24H).withMessage('Start time must be 24-hour HH:MM'),
  body('endTime').optional().matches(TIME_24H).withMessage('End time must be 24-hour HH:MM'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium or high'),
];

// Routine update rules (partial update)
export const routineUpdateValidation = [
  body('activityName').optional().trim().notEmpty().withMessage('Activity name cannot be empty'),
  body('startTime').optional().matches(TIME_24H).withMessage('Start time must be 24-hour HH:MM'),
  body('endTime').optional().matches(TIME_24H).withMessage('End time must be 24-hour HH:MM'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium or high'),
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
