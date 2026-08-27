/**
 * KNOWN FACE MODEL — an enrolled person the patient should recognise.
 *
 * Key concepts: `descriptor` is a 128-number face-api.js embedding, validated to be exactly
 * length 128; recognition compares a live descriptor against these; recognitionCount/lastSeen
 * track usage for per-person history.
 * Viva line: "A KnownFace stores a 128-dimension face embedding that recognition matches against."
 */
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
        // Every entry must be a real number, not just the right count: Number(null)
        // is 0 and NaN is still typeof "number", so a length-only check would let
        // a junk descriptor through and quietly break face matching.
        validator: (arr: any) =>
          Array.isArray(arr) && arr.length === 128 && arr.every((n) => Number.isFinite(n)),
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
