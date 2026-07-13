import mongoose, { Schema } from 'mongoose';

const caregiverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Caregiver must be associated with a user'],
    },
    specialization: {
      type: String,
    },
    assignedPatients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
      },
    ],
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Caregiver', caregiverSchema);
