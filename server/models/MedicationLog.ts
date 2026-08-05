/**
 * MEDICATION LOG MODEL — one adherence record per scheduled dose.
 *
 * Key concepts: `status` enum (taken/missed/upcoming/skipped) drives compliance reporting;
 * the scheduler auto-creates a 'missed' log once a dose is past its grace period with no log;
 * `scheduledTime` + `takenAt` capture planned vs actual.
 * Viva line: "MedicationLog is the audit trail of whether each dose was taken, missed, or skipped."
 */
import mongoose, { Schema } from 'mongoose';

const medicationLogSchema = new mongoose.Schema({
  medication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medication',
    required: [true, 'MedicationLog must reference a medication'],
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'MedicationLog must be associated with a patient'],
  },
  scheduledTime: {
    type: Date,
    required: [true, 'Please provide scheduled time'],
  },
  status: {
    type: String,
    enum: ['taken', 'missed', 'upcoming', 'skipped'],
    default: 'upcoming',
  },
  takenAt: {
    type: Date,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('MedicationLog', medicationLogSchema);
