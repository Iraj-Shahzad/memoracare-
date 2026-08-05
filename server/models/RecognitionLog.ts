/**
 * RECOGNITION LOG MODEL — one record per face-scan the patient performed.
 *
 * Key concepts: `result` enum (recognized/unknown); on a match `knownFace` links the enrolled
 * person and `recognizedPerson` snapshots their name/relationship; `confidence` stores the match
 * score. An 'unknown' result can trigger a face_unknown alert.
 * Viva line: "RecognitionLog is the history of every face scan and whether it matched a known person."
 */
import mongoose, { Schema } from 'mongoose';

const recognitionLogSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'RecognitionLog must be associated with a patient'],
  },
  imageUrl: {
    type: String,
  },
  // When recognized, the enrolled face this scan matched (for per-person galleries).
  knownFace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnownFace',
  },
  result: {
    type: String,
    enum: ['recognized', 'unknown'],
    required: [true, 'Please provide recognition result'],
  },
  recognizedPerson: {
    name: String,
    relationship: String,
  },
  confidence: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('RecognitionLog', recognitionLogSchema);
