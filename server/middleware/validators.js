const { body, validationResult } = require('express-validator');

// Register validation rules
exports.registerValidation = [
  body('name', 'Name is required').trim().notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please provide a password with 6 or more characters').isLength({ min: 6 }),
  body('phone', 'Phone number is required').trim().notEmpty(),
  body('role', 'Role must be one of: patient, caregiver, admin').isIn(['patient', 'caregiver', 'admin']),
];

// Login validation rules
exports.loginValidation = [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists(),
];

// Medication validation rules
exports.medicationValidation = [
  body('name', 'Medication name is required').trim().notEmpty(),
  body('dosage', 'Dosage is required').trim().notEmpty(),
  body('patient', 'Patient ID is required').trim().notEmpty(),
];

// Routine validation rules
exports.routineValidation = [
  body('activityName', 'Activity name is required').trim().notEmpty(),
  body('patient', 'Patient ID is required').trim().notEmpty(),
];

// Validation error handler middleware
exports.handleValidationErrors = (req, res, next) => {
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
