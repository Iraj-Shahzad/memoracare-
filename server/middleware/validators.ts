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

const MAX_TIMES = 6;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// NOTE: isArray({ min: 1 }) matters. An empty times array would otherwise pass
// (every() on an empty array is true), and the scheduler skips a medication with
// no times, so it would silently never remind and never be flagged as missed.
const timesRule = body('times')
  .optional()
  .isArray({ min: 1, max: MAX_TIMES })
  .withMessage(`Provide between 1 and ${MAX_TIMES} reminder times`)
  .bail()
  .custom((arr: any[]) => arr.every((t) => TIME_24H.test(String(t))))
  .withMessage('Each reminder time must be 24-hour HH:MM, for example 09:00')
  .bail()
  .custom((arr: any[]) => new Set(arr.map(String)).size === arr.length)
  .withMessage('Reminder times must be unique');

// Same trap as times: an empty days array makes the scheduler treat the routine
// as "every day" while the UI filters it out, so it raises missed alerts for a
// routine the patient can never see or complete.
const daysRule = body('days')
  .optional()
  .isArray({ min: 1 }).withMessage('Select at least one day for the routine to repeat')
  .bail()
  .custom((arr: any[]) => arr.every((d) => WEEKDAYS.includes(String(d))))
  .withMessage(`Days must be full weekday names, for example ${WEEKDAYS[0]}`)
  .bail()
  .custom((arr: any[]) => new Set(arr.map(String)).size === arr.length)
  .withMessage('Days must be unique');

// An endDate before the startDate makes the medication permanently inactive, so
// it never reminds and is never flagged as missed. Nothing in the UI shows why.
const medDateRules = [
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional({ nullable: true }).isISO8601().withMessage('End date must be a valid date')
    .bail()
    .custom((end, { req }) => {
      if (!req.body.startDate) return true;
      if (new Date(end) < new Date(req.body.startDate)) throw new Error('End date cannot be before the start date');
      return true;
    }),
];

const endAfterStart = body('endTime').optional().custom((end, { req }) => {
  const start = req.body.startTime;
  if (!start || !TIME_24H.test(String(start))) return true;
  if (String(end) <= String(start)) throw new Error('End time must be after the start time');
  return true;
});

// Medication validation rules (create: required fields must be present)
export const medicationValidation = [
  body('name', 'Medication name is required').trim().notEmpty()
    .bail()
    .isLength({ max: 100 }).withMessage('Medication name must be 100 characters or fewer'),
  body('dosage', 'Dosage is required').trim().notEmpty()
    .bail()
    .isLength({ max: 30 }).withMessage('Dosage must be 30 characters or fewer')
    .bail()
    .matches(DOSAGE).withMessage('Dosage must be a number followed by a unit, for example 5mg'),
  body('patient', 'Patient ID is required').trim().notEmpty(),
  body('instructions').optional().isLength({ max: 500 }).withMessage('Instructions must be 500 characters or fewer'),
  ...medDateRules,
  timesRule,
];

// Medication update rules (partial update: every field optional, but if a field
// IS sent it must still be valid).
export const medicationUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Medication name cannot be empty')
    .bail()
    .isLength({ max: 100 }).withMessage('Medication name must be 100 characters or fewer'),
  body('dosage').optional().trim().notEmpty().withMessage('Dosage cannot be empty')
    .bail()
    .isLength({ max: 30 }).withMessage('Dosage must be 30 characters or fewer')
    .bail()
    .matches(DOSAGE).withMessage('Dosage must be a number followed by a unit, for example 5mg'),
  body('instructions').optional().isLength({ max: 500 }).withMessage('Instructions must be 500 characters or fewer'),
  ...medDateRules,
  timesRule,
];

// Routine validation rules (create).
// startTime is REQUIRED here: without it the scheduler can never work out when
// the routine is due, so it would never remind and never be marked missed.
export const routineValidation = [
  body('activityName', 'Activity name is required').trim().notEmpty()
    .bail()
    .isLength({ max: 100 }).withMessage('Activity name must be 100 characters or fewer'),
  body('patient', 'Patient ID is required').trim().notEmpty(),
  body('startTime', 'Start time is required').trim().notEmpty()
    .bail()
    .matches(TIME_24H).withMessage('Start time must be 24-hour HH:MM'),
  body('endTime').optional().matches(TIME_24H).withMessage('End time must be 24-hour HH:MM'),
  endAfterStart,
  // Required, not optional: omitting days leaves the schema default of [], which
  // getTodayRoutines (days: dayName) can never match, so the routine is invisible
  // to the patient while the scheduler still marks it missed.
  body('days', 'Select at least one day for the routine to repeat').exists(),
  daysRule,
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be 500 characters or fewer'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium or high'),
];

// Routine update rules (partial update)
export const routineUpdateValidation = [
  body('activityName').optional().trim().notEmpty().withMessage('Activity name cannot be empty')
    .bail()
    .isLength({ max: 100 }).withMessage('Activity name must be 100 characters or fewer'),
  body('startTime').optional().matches(TIME_24H).withMessage('Start time must be 24-hour HH:MM'),
  body('endTime').optional().matches(TIME_24H).withMessage('End time must be 24-hour HH:MM'),
  endAfterStart,
  daysRule,
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be 500 characters or fewer'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium or high'),
];

// Medication log rules. status MUST be present: the Mongoose enum only checks a
// value that exists, so omitting it silently fell back to "upcoming", which the
// scheduler reads as "already handled" and therefore suppresses the missed-dose
// alert. scheduledTime is pinned to today because the idempotency check only
// looks at today's window, so any other date creates an unbounded stream of new
// logs and lets the compliance figure be inflated.
export const medicationLogValidation = [
  body('status', 'Status must be one of: taken, missed, upcoming, skipped')
    .exists().bail().isIn(['taken', 'missed', 'upcoming', 'skipped']),
  body('scheduledTime').optional().isISO8601().withMessage('scheduledTime must be a valid date')
    .bail()
    .custom((v) => {
      const d = new Date(v);
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
      if (d < dayStart || d > dayEnd) throw new Error('A dose can only be logged for today');
      return true;
    }),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be 500 characters or fewer'),
];

export const routineLogValidation = [
  body('status', 'Status must be one of: completed, missed, upcoming, skipped')
    .exists().bail().isIn(['completed', 'missed', 'upcoming', 'skipped']),
  body('scheduledDate').optional().isISO8601().withMessage('scheduledDate must be a valid date')
    .bail()
    .custom((v) => {
      const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
      if (new Date(v) > dayEnd) throw new Error('A routine cannot be completed for a future date');
      return true;
    }),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be 500 characters or fewer'),
];

// Caregiver note rules (Mongoose only checks "required", so " " would pass).
export const noteValidation = [
  body('patient', 'Patient ID is required').trim().notEmpty(),
  body('content', 'Note content is required').trim().notEmpty()
    .bail()
    .isLength({ min: 3, max: 1000 }).withMessage('A note must be between 3 and 1000 characters'),
];

// Editing a note only sends the changed fields, so nothing is required here.
export const noteUpdateValidation = [
  body('content').optional().trim().notEmpty().withMessage('Note content cannot be empty')
    .bail()
    .isLength({ min: 3, max: 1000 }).withMessage('A note must be between 3 and 1000 characters'),
];

// Validation error handler middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // The UI shows `message`, so surface the first real reason ("Dosage must be
    // a number followed by a unit") instead of a generic "Validation failed".
    const list = errors.array();
    return res.status(400).json({
      success: false,
      message: (list[0] as any)?.msg || 'Validation failed',
      errors: list,
    });
  }
  next();
};
