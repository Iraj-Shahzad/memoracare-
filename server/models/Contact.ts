/**
 * CONTACT MODEL — a public "contact us" submission handled by admins.
 *
 * Key concepts: captures name/email/phone/subject/message from the marketing site; `subject`
 * and `status` (new/in_progress/resolved) are enums; resolvedBy/adminNotes support triage.
 * Viva line: "Contact stores public enquiries and their admin triage status."
 */
import mongoose, { Schema } from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Please select a subject'],
      enum: ['general', 'support', 'account', 'feedback', 'partnership'],
    },
    message: {
      type: String,
      required: [true, 'Please provide a message'],
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    adminNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Contact', contactSchema);
