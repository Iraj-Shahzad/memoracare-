/**
 * USER MODEL — the single auth/identity record for every account (patient, caregiver, admin).
 *
 * Key concepts: bcrypt pre-save hash (only re-hashes when password modified);
 * password stored with select:false so it never leaks in normal queries; matchPassword()
 * compares a login attempt via bcrypt.compare; getResetPasswordToken() returns a RAW token
 * but stores only its SHA-256 hash + a 30-minute expiry (a leaked DB can't reset accounts);
 * role enum drives all RBAC; unique lowercase email with regex validation.
 * Viva line: "The User model centralises identity and never persists a plaintext password or reset token."
 */
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  phone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['patient', 'caregiver', 'admin'],
    required: [true, 'Please specify a role'],
  },
  avatar: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Per-user UI/notification preferences (Settings page). Free-form object so
  // preferences can evolve without a migration.
  settings: {
    type: Object,
    default: {},
  },
  // Password-reset: we store only a HASH of the reset token (never the raw
  // token), so a leaked DB can't be used to reset accounts. select:false keeps
  // these out of normal queries. Expire is a short-lived deadline.
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpire: {
    type: Date,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash the password before saving.
// Async pre-hooks in modern Mongoose do not receive a `next` callback — the
// hook just awaits/returns, so we must NOT call next() here.
userSchema.pre('save', async function (this: any) {
  // Only hash if the password is new or modified.
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function (this: any, enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate a password-reset token. Returns the RAW token (to email to the
// user); stores only its SHA-256 hash + a 30-minute expiry on the document.
// Caller must save() the document afterwards.
userSchema.methods.getResetPasswordToken = function (this: any): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return rawToken;
};

export default mongoose.model('User', userSchema);
