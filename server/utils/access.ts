/**
 * ACCESS UTIL — the central patient-authorization rule that prevents IDOR.
 *
 * Key concepts: canAccessPatient(user, patientId) enforces admin => any patient,
 * patient => only their own record (patient.user === user id), caregiver => only patients
 * whose assignedCaregivers include them; any other case returns false. Controllers call this
 * before returning or mutating patient-scoped data so a valid token can't read another
 * patient's records by guessing an id (Insecure Direct Object Reference protection).
 * Viva line: "One shared helper answers 'may this user touch this patient?' so authorization isn't duplicated or forgotten."
 */
import Patient from '../models/Patient';

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
// patientId accepts a string OR a Mongoose ObjectId (controllers often pass
// `doc.patient` which is an ObjectId) — typed `any` so callers don't need .toString().
async function canAccessPatient(user: any, patientId: any) {
  if (!user) return false;
  // Admin first — an admin may act on records with no patient at all (e.g. a
  // system-level alert), so this must short-circuit BEFORE the patientId guard.
  if (user.role === 'admin') return true;
  if (!patientId) return false;

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

export { canAccessPatient };
