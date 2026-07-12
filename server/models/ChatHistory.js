const mongoose = require('mongoose');

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

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
