const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Reminder must be associated with a patient'],
  },
  type: {
    type: String,
    enum: ['medication', 'routine', 'custom'],
    required: [true, 'Please provide reminder type'],
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    // Can point to Medication or Routine
  },
  scheduledTime: {
    type: Date,
    required: [true, 'Please provide scheduled time'],
  },
  message: {
    type: String,
  },
  isDelivered: {
    type: Boolean,
    default: false,
  },
  deliveredAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Reminder', reminderSchema);
