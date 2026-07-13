import mongoose, { Schema } from 'mongoose';

// A face enrolled for a patient (family member, caregiver, doctor, ...).
// `descriptor` is the 128-number face embedding produced by face-api.js in the
// browser. Recognition = comparing a live descriptor against these.
const knownFaceSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'KnownFace must be associated with a patient'],
    },
    name: {
      type: String,
      required: [true, 'Please provide the person\'s name'],
      trim: true,
    },
    relationship: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    descriptor: {
      type: [Number],
      required: [true, 'A face descriptor is required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 128,
        message: 'Descriptor must be an array of 128 numbers',
      },
    },
    phone: {
      type: String,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recognitionCount: {
      type: Number,
      default: 0,
    },
    lastSeen: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model('KnownFace', knownFaceSchema);
