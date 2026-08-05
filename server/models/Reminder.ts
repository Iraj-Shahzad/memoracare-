/**
 * REMINDER MODEL — a record of a "time to do X" prompt sent to a patient.
 *
 * Key concepts: `type` (medication/routine/custom) with a polymorphic `referenceId` pointing
 * at a Medication or Routine; the scheduler creates one (isDelivered:true) each time it emits a
 * real-time reminder, so it doubles as a delivery log.
 * Viva line: "A Reminder logs each real-time prompt the scheduler pushed to the patient."
 */
import mongoose, { Schema } from 'mongoose';

const reminderSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Reminder must be associated with a patient'],
  },
  type: {
    type: String,
    enum: ['medication', 'routine', 'custom'],
    required: [true, 'Please provide reminder type'],
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    // Can point to Medication or Routine
  },
  scheduledTime: {
    type: Date,
    required: [true, 'Please provide scheduled time'],
  },
  message: {
    type: String,
  },
  isDelivered: {
    type: Boolean,
    default: false,
  },
  deliveredAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Reminder', reminderSchema);
