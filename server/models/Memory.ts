import mongoose, { Schema } from 'mongoose';

// A memory-aid entry for a patient: a photo of a person, place, or event with
// context to help them remember (who, where, when, and a short note).
const memorySchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Memory must be associated with a patient'],
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    people: [
      {
        type: String,
      },
    ],
    location: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
    },
    description: {
      type: String,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Memory', memorySchema);
