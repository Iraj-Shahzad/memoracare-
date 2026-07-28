import mongoose, { Schema } from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Note must be associated with a patient'],
    },
    caregiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Note must be created by a caregiver'],
    },
    content: {
      type: String,
      required: [true, 'Please provide note content'],
    },
    // Lets caregivers tag what a note is about, so notes are more specific
    // and can be scanned/filtered by category.
    category: {
      type: String,
      enum: ['observation', 'medication', 'behavior', 'health', 'incident', 'general'],
      default: 'observation',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Note', noteSchema);
