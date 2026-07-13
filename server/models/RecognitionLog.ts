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
