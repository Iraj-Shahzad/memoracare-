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

// Shared identity rules used by several forms.
const PHONE = /^[\d\s()+-]{7,20}$/;
const CNIC = /^\d{5}-?\d{7}-?\d$/;
const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// A date of birth must be a real PAST date implying an age under 120.
const dobRule = (field = 'dateOfBirth') =>
  body(field).optional({ checkFalsy: true })
    .isISO8601().withMessage('Date of birth must be a valid date')
    .bail()
    .custom((v) => {
      const d = new Date(v);
      const oldest = new Date(); oldest.setFullYear(oldest.getFullYear() - 120);
      if (d > new Date()) throw new Error('Date of birth cannot be in the future');
      if (d < oldest) throw new Error('Date of birth is not realistic (age must be under 120)');
      return true;
    });

// Blank CNIC must become undefined, never "". The index is unique+sparse, and
// sparse skips MISSING fields only, so a second empty string collides with the
// first and that patient can never save their profile again.
const cnicRule = body('cnic')
  .customSanitizer((v) => (String(v ?? '').trim() === '' ? undefined : String(v).trim()))
  .optional()
  .matches(CNIC).withMessage('CNIC must be 13 digits, for example 35201-1234567-1');

// Register validation rules
// (phone and role are optional here; the controller safely defaults role to
//  "patient"/"caregiver" so public sign-up can never create an admin.)
export const registerValidation = [
  body('name', 'Name is required').trim().notEmpty()
    .bail().isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email', 'Please include a valid email').trim().isEmail()
    .bail().isLength({ max: 254 }).withMessage('Email is too long'),
  // bcrypt only hashes the first 72 bytes, so a longer password is misleading.
  body('password', 'Password must be between 6 and 72 characters').isLength({ min: 6, max: 72 }),
  body('phone').optional({ checkFalsy: true }).trim().matches(PHONE).withMessage('Enter a valid phone number'),
  body('role', 'Role must be one of: patient, caregiver, admin').optional().isIn(['patient', 'caregiver', 'admin']),
];

// Login validation rules
export const loginValidation = [
  body('email', 'Please include a valid email').trim().isEmail(),
  body('password', 'Password is required').exists(),
];

// ---- Caregiver creating a patient account ----
export const createPatientValidation = [
  body('name', 'Patient name is required').trim().notEmpty()
    .bail().isLength({ min: 3, max: 100 }).withMessage('Name must be 3 to 100 characters'),
  body('email', 'Please include a valid email').trim().isEmail()
    .bail().isLength({ max: 254 }).withMessage('Email is too long'),
  body('password', 'Password must be between 6 and 72 characters').isLength({ min: 6, max: 72 }),
  body('phone').optional({ checkFalsy: true }).trim().matches(PHONE).withMessage('Enter a valid phone number'),
  dobRule('dateOfBirth'),
  body('gender').optional({ checkFalsy: true }).isIn(GENDERS).withMessage('Gender must be Male, Female or Other'),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('City must be 60 characters or fewer'),
  body('diagnosis').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Diagnosis must be 120 characters or fewer'),
  body('doctor').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Doctor must be 100 characters or fewer'),
];

// ---- Patient profile update ----
export const updatePatientValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Please include a valid email')
    .bail().isLength({ max: 254 }).withMessage('Email is too long'),
  body('phone').optional({ checkFalsy: true }).trim().matches(PHONE).withMessage('Enter a valid phone number'),
  dobRule('dateOfBirth'),
  body('gender').optional({ checkFalsy: true }).isIn(GENDERS).withMessage('Gender must be Male, Female or Other'),
  body('bloodGroup').optional({ checkFalsy: true }).isIn(BLOOD_GROUPS)
    .withMessage('Blood group must be one of A+, A-, B+, B-, O+, O-, AB+, AB-'),
  cnicRule,
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 250 }).withMessage('Address must be 250 characters or fewer'),
  body('diagnosis').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Diagnosis must be 120 characters or fewer'),
  body('doctor').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Doctor must be 100 characters or fewer'),
  body('medicalHistory').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage('Notes must be 2000 characters or fewer'),
  body('emergencyContacts').optional().isArray({ max: 5 })
    .withMessage('At most 5 emergency contacts are allowed')
    .bail()
    .custom((arr: any[]) => arr.every((c) =>
      c && typeof c === 'object' &&
      String(c.name || '').trim().length >= 2 && String(c.name).length <= 100 &&
      String(c.relationship || '').trim().length >= 2 && String(c.relationship).length <= 50 &&
      PHONE.test(String(c.phone || '').trim())))
    .withMessage('Each emergency contact needs a name, a relationship and a valid phone number'),
];

// ---- Admin user management ----
export const createUserValidation = [
  body('name', 'Name is required').trim().notEmpty()
    .bail().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters'),
  body('email', 'Please include a valid email').trim().isEmail()
    .bail().isLength({ max: 254 }).withMessage('Email is too long'),
  body('password', 'Password must be between 6 and 72 characters').isLength({ min: 6, max: 72 }),
  body('phone').optional({ checkFalsy: true }).trim().matches(PHONE).withMessage('Enter a valid phone number'),
  body('role', 'Role must be one of: patient, caregiver, admin').optional().isIn(['patient', 'caregiver', 'admin']),
];

export const updateUserValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters'),
  body('phone').optional({ checkFalsy: true }).trim().matches(PHONE).withMessage('Enter a valid phone number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
];

// ---- Caregiver's own profile ----
export const caregiverProfileValidation = [
  body('name').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be 3 to 100 characters'),
  body('phone').optional({ checkFalsy: true }).trim().matches(PHONE).withMessage('Enter a valid phone number'),
  body('specialization').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Specialization must be 100 characters or fewer'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('About must be 1000 characters or fewer'),
];

// ---- Password recovery ----
// isEmail() also blocks a non-string body such as {"email":{"$gt":""}}, which
// previously reached email.toLowerCase() and crashed with a 500.
export const forgotPasswordValidation = [
  body('email', 'Please include a valid email').isEmail(),
];

export const resetPasswordValidation = [
  body('password', 'Password must be between 6 and 72 characters').isLength({ min: 6, max: 72 }),
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
// The 2000 cap must match the counter on the notes form, otherwise the API
// would reject a note the UI told the caregiver was still within the limit.
const NOTE_MAX = 2000;
const NOTE_CATEGORIES = ['observation', 'medication', 'behavior', 'health', 'incident', 'general'];

export const noteValidation = [
  body('patient', 'Patient ID is required').trim().notEmpty(),
  body('content', 'Note content is required').trim().notEmpty()
    .bail()
    .isLength({ max: NOTE_MAX }).withMessage(`A note must be ${NOTE_MAX} characters or fewer`),
  body('category').optional().isIn(NOTE_CATEGORIES).withMessage('Invalid note category'),
];

// Editing a note only sends the changed fields, so nothing is required here.
export const noteUpdateValidation = [
  body('content').optional().trim().notEmpty().withMessage('Note content cannot be empty')
    .bail()
    .isLength({ max: NOTE_MAX }).withMessage(`A note must be ${NOTE_MAX} characters or fewer`),
  body('category').optional().isIn(NOTE_CATEGORIES).withMessage('Invalid note category'),
];

// ---- Public contact form (the only unauthenticated write endpoint) ----
export const contactValidation = [
  body('name', 'Name is required').trim().notEmpty()
    .bail().isLength({ max: 80 }).withMessage('Name must be 80 characters or fewer'),
  body('email', 'Please provide a valid email address').trim().isEmail()
    .bail().isLength({ max: 120 }).withMessage('Email must be 120 characters or fewer'),
  body('phone').optional({ values: 'falsy' }).trim()
    .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Please provide a valid phone number'),
  body('subject').optional().isIn(['general', 'support', 'account', 'feedback', 'partnership'])
    .withMessage('Please select a valid subject'),
  body('message', 'Message is required').trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters'),
];

// ---- Memory gallery (fields arrive as multipart text alongside the image) ----
export const memoryValidation = [
  body('title', 'Title is required').trim().notEmpty()
    .bail().isLength({ min: 3, max: 100 }).withMessage('Title must be 3 to 100 characters'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be 100 characters or fewer'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer'),
  body('people').optional().isLength({ max: 500 }).withMessage('People must be 500 characters or fewer'),
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('Date must be a valid date')
    .bail()
    .custom((v) => {
      if (new Date(v) > new Date()) throw new Error('The date cannot be in the future');
      return true;
    }),
];

// ---- Known face enrolment ----
export const knownFaceValidation = [
  body('name', 'Name is required').trim().notEmpty()
    .bail().isLength({ min: 2, max: 60 }).withMessage('Name must be 2 to 60 characters'),
  body('relationship').optional().trim().isLength({ max: 40 }).withMessage('Relationship must be 40 characters or fewer'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must be 20 characters or fewer'),
];

// ---- Chatbot. The controller accepts either `query` or `message`. ----
export const chatValidation = [
  body('query').optional().trim().isLength({ max: 1000 }).withMessage('Message must be 1000 characters or fewer'),
  body('message').optional().trim().isLength({ max: 1000 }).withMessage('Message must be 1000 characters or fewer'),
  body('mode').optional().isIn(['text', 'voice']).withMessage('Mode must be text or voice'),
  body('lang').optional().isIn(['en', 'ur']).withMessage('Language must be en or ur'),
];

// ---- Report generation ----
// `type` is checked with isString first: the controller calls type.replace(),
// which throws a 500 TypeError if a number is sent (a number passes a plain
// truthy check).
const REPORT_TYPES = ['medication', 'routine', 'recognition', 'weekly_summary', 'monthly_overview', 'emergency', 'compliance', 'system'];
export const reportValidation = [
  body('type').optional().isString().withMessage('Report type must be text')
    .bail().isIn(REPORT_TYPES).withMessage('Please choose a valid report type'),
  body('format').optional().isIn(['pdf', 'excel', 'xlsx']).withMessage('Format must be pdf or excel'),
  body('from').optional({ values: 'falsy' }).isISO8601().withMessage('The From date must be a valid date'),
  body('to').optional({ values: 'falsy' }).isISO8601().withMessage('The To date must be a valid date')
    .bail()
    .custom((to, { req }) => {
      const toDate = new Date(to);
      if (toDate > new Date()) throw new Error('The To date cannot be in the future');
      if (req.body.from) {
        const fromDate = new Date(req.body.from);
        if (fromDate > toDate) throw new Error('The From date must be before the To date');
        if ((toDate.getTime() - fromDate.getTime()) / 86400000 > 730) {
          throw new Error('The period must be 2 years or less');
        }
      }
      return true;
    }),
];

// ---- Change password ----
// bcrypt only hashes the first 72 bytes, so a longer password gives the user a
// false sense of strength.
export const changePasswordValidation = [
  body('currentPassword', 'Current password is required').exists(),
  body('newPassword').isLength({ min: 6, max: 72 })
    .withMessage('New password must be between 6 and 72 characters')
    .bail()
    .custom((v, { req }) => v !== req.body.currentPassword)
    .withMessage('The new password must be different from the current one'),
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
