/**
 * CHAT HISTORY MODEL — a stored turn of the patient's assistant conversation.
 *
 * Key concepts: `mode` (text/voice); stores the `query` and `response` pair plus the NLP-classified
 * `intent` and `confidence`, giving both a transcript and analytics on the assistant.
 * Viva line: "ChatHistory persists each assistant exchange along with the classified intent."
 */
import mongoose, { Schema } from 'mongoose';

const chatHistorySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'ChatHistory must be associated with a patient'],
  },
  mode: {
    type: String,
    enum: ['text', 'voice'],
    default: 'text',
  },
  query: {
    type: String,
    required: [true, 'Please provide a query'],
  },
  response: {
    type: String,
    required: [true, 'Please provide a response'],
  },
  intent: {
    type: String,
    // classified intent from NLP model
  },
  confidence: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('ChatHistory', chatHistorySchema);
