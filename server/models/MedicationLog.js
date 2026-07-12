const mongoose = require('mongoose');

const medicationLogSchema = new mongoose.Schema({
  medication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medication',
    required: [true, 'MedicationLog must reference a medication'],
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'MedicationLog must be associated with a patient'],
  },
  scheduledTime: {
    type: Date,
    required: [true, 'Please provide scheduled time'],
  },
  status: {
    type: String,
    enum: ['taken', 'missed', 'upcoming', 'skipped'],
    default: 'upcoming',
  },
  takenAt: {
    type: Date,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('MedicationLog', medicationLogSchema);
