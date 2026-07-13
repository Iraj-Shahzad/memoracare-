const Patient = require('../models/Patient');

/**
 * Whether `user` is allowed to access/modify data for a given patient.
 *  - admin      → any patient
 *  - caregiver  → only patients they are assigned to
 *  - patient    → only their own record
 *
 * @param {Object} user       req.user (has .id and .role)
 * @param {String} patientId  the Patient _id
 * @returns {Promise<boolean>}
 */
async function canAccessPatient(user, patientId) {
  if (!user || !patientId) return false;
  if (user.role === 'admin') return true;

  const patient = await Patient.findById(patientId).select('user assignedCaregivers');
  if (!patient) return false;

  const uid = (user.id || user._id).toString();

  if (user.role === 'patient') {
    return patient.user && patient.user.toString() === uid;
  }
  if (user.role === 'caregiver') {
    return (patient.assignedCaregivers || []).some((c) => c.toString() === uid);
  }
  return false;
}

module.exports = { canAccessPatient };
