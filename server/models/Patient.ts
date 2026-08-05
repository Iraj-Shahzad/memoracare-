/**
 * PATIENT MODEL — the clinical profile for a person receiving memory care.
 *
 * Key concepts: 1-to-1 link to a User via `user` (ObjectId ref); `assignedCaregivers`
 * is the array that powers caregiver access checks (see utils/access.ts); `cnic` is
 * unique+sparse so it's only enforced when present; embedded emergencyContacts subdocs.
 * Viva line: "The Patient record holds medical context and the caregiver assignment list that authorises access."
 */
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
      sparse: true, // sparse: uniqueness only enforced on docs that actually have a cnic
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
    // Caregivers granted access to this patient; the source of truth for the
    // caregiver branch of canAccessPatient (IDOR protection).
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
