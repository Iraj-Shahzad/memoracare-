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
