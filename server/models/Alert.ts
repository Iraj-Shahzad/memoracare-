/**
 * ALERT MODEL — a caregiver-facing notification about a patient event.
 *
 * Key concepts: `type` enum (medication_missed/routine_missed/sos/face_unknown/system) +
 * `severity` (critical/warning/info); raised by the scheduler and other flows, delivered to
 * caregiver socket rooms; isResolved/resolvedBy/resolvedAt support acknowledgement.
 * Viva line: "Alerts are the persisted record of anything a caregiver needs to act on."
 */
import mongoose, { Schema } from 'mongoose';

const alertSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
  },
  caregiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  type: {
    type: String,
    enum: ['medication_missed', 'routine_missed', 'sos', 'face_unknown', 'system'],
    required: [true, 'Please provide alert type'],
  },
  severity: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: [true, 'Please provide alert severity'],
  },
  message: {
    type: String,
    required: [true, 'Please provide alert message'],
  },
  isResolved: {
    type: Boolean,
    default: false,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Alert', alertSchema);
