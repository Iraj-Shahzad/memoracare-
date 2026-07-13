import mongoose, { Schema } from 'mongoose';

const routineLogSchema = new mongoose.Schema({
  routine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Routine',
    required: [true, 'RoutineLog must reference a routine'],
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'RoutineLog must be associated with a patient'],
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Please provide scheduled date'],
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'upcoming', 'skipped'],
    default: 'upcoming',
  },
  completedAt: {
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

export default mongoose.model('RoutineLog', routineLogSchema);
