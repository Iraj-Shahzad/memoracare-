/**
 * ROUTINE MODEL — a recurring daily activity for a patient (e.g. walk, meal).
 *
 * Key concepts: `startTime` is an "HH:MM" string the scheduler parses; `days` limits which
 * weekdays it runs (empty = every day); `priority` maps to alert severity when missed
 * (high => critical); isActive toggles it on/off.
 * Viva line: "A Routine defines a scheduled activity whose priority decides how serious a missed alert is."
 */
import mongoose, { Schema } from 'mongoose';

const routineSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Routine must be associated with a patient'],
    },
    activityName: {
      type: String,
      required: [true, 'Please provide activity name'],
      trim: true,
    },
    description: {
      type: String,
    },
    startTime: {
      type: String,
      // e.g., "05:30"
    },
    endTime: {
      type: String,
    },
    days: [
      {
        type: String,
        // e.g., ["Monday", "Tuesday"...]
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
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

export default mongoose.model('Routine', routineSchema);
