/**
 * CAREGIVER MODEL — the professional/family-carer profile linked to a User.
 *
 * Key concepts: 1-to-1 `user` ref; `assignedPatients` mirrors the caregiver->patient
 * relationship (Patient also stores assignedCaregivers); timestamps enabled.
 * Viva line: "The Caregiver model extends a User with a specialisation and the list of patients they care for."
 */
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
