/**
 * MEDICATION MODEL — a prescribed drug for a patient with its dosing schedule.
 *
 * Key concepts: `times` is an array of "HH:MM" strings the reminder scheduler parses to
 * fire per-minute reminders and detect missed doses; startDate/endDate + isActive bound
 * when it applies; `addedBy` records the authoring user for audit.
 * Viva line: "Each Medication carries the daily dose times the scheduler uses to remind and to flag misses."
 */
import mongoose, { Schema } from 'mongoose';

const medicationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Medication must be associated with a patient'],
    },
    name: {
      type: String,
      required: [true, 'Please provide medication name'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Please provide dosage'],
    },
    frequency: {
      type: String,
      // e.g., "Once daily", "Twice daily"
    },
    times: [
      {
        type: String,
        // e.g., ["09:00", "21:00"]
      },
    ],
    instructions: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Medication', medicationSchema);
