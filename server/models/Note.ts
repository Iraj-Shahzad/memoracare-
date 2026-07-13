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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Note', noteSchema);
