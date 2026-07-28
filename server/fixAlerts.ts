/**
 * One-time patch: rewrite EXISTING alert messages in MongoDB so missed-med/
 * routine alerts state the actual scheduled time + date, instead of the old
 * generic "scheduled earlier today". Does NOT touch any other data — safe to
 * run on a live database.
 *
 * Run from the server folder:  ts-node fixAlerts.ts
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from './config/db';
import Alert from './models/Alert';
import Medication from './models/Medication';
import Routine from './models/Routine';
import Patient from './models/Patient';

async function run() {
  await connectDB();

  const alerts = await Alert.find({ type: { $in: ['medication_missed', 'routine_missed'] } });
  let updated = 0;

  for (const a of alerts as any[]) {
    // Already in the new format? Leave it.
    if (a.message && a.message.includes(' — scheduled ')) continue;

    const patient = await Patient.findById(a.patient).populate('user', 'name');
    const name = (patient as any)?.user?.name || 'Patient';
    const dateStr = new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    if (a.type === 'medication_missed') {
      const med = await Medication.findOne({ patient: a.patient, isActive: true });
      if (!med) continue;
      const t = (med.times && med.times[0]) || '';
      a.message = `${name} missed ${med.name}${med.dosage ? ` (${med.dosage})` : ''} — scheduled ${t} on ${dateStr}`;
    } else {
      const rt = await Routine.findOne({ patient: a.patient, isActive: true });
      if (!rt) continue;
      a.message = `${name} missed the ${rt.activityName} routine — scheduled ${rt.startTime} on ${dateStr}`;
    }

    await a.save();
    updated++;
  }

  console.log(`✓ Rewrote ${updated} alert message(s). Other data untouched.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('fixAlerts failed:', err);
  process.exit(1);
});
