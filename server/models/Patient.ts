import mongoose, { Schema } from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient must be associated with a user'],
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    cnic: {
      type: String,
      unique: true,
      sparse: true,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
      default: 'Islamabad',
    },
    diagnosis: {
      type: String,
      // e.g., "Alzheimer's Disease - Early Stage"
    },
    doctor: {
      type: String,
    },
    bloodGroup: {
      type: String,
    },
    allergies: [
      {
        type: String,
      },
    ],
    medicalHistory: {
      type: String,
    },
    emergencyContacts: [
      {
        name: String,
        relationship: String,
        phone: String,
      },
    ],
    assignedCaregivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Patient', patientSchema);
