/**
 * MemoryCare Database Seed Script  (rich demo dataset)
 *
 * Usage:  ts-node seed.ts     (or: npm run seed)
 *
 * Creates a full, realistic Pakistani dataset so every page has data:
 *  - 1 Admin, 4 Caregivers, 8 Patients
 *  - Medications + 7 days of medication logs
 *  - Routines + 7 days of routine logs
 *  - Alerts, Notes, Memories, Known Faces, Recognition Logs, Chat History
 *  - A few Contact form submissions
 *
 * NOTE: passwords are passed in PLAIN text; the User model's pre-save hook
 *       hashes them once. (Do not hash here or login breaks — double hash.)
 *
 * WARNING: this clears ALL existing data before seeding.
 */

import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

import User from './models/User';
import Patient from './models/Patient';
import Caregiver from './models/Caregiver';
import Medication from './models/Medication';
import MedicationLog from './models/MedicationLog';
import Routine from './models/Routine';
import RoutineLog from './models/RoutineLog';
import ChatHistory from './models/ChatHistory';
import Alert from './models/Alert';
import Note from './models/Note';
import Report from './models/Report';
import Contact from './models/Contact';
import Memory from './models/Memory';
import KnownFace from './models/KnownFace';
import RecognitionLog from './models/RecognitionLog';

import connectDB from './config/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// A valid 128-length face descriptor. Synthetic (real matching needs live
// enrollment), but it makes the "Known Faces" list populated for testing.
const fakeDescriptor = (s: number): number[] =>
  Array.from({ length: 128 }, (_, i) => Number(Math.sin(s * 7.13 + i * 0.37).toFixed(4)));

const at = (daysAgo: number, h: number, m: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d;
};

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------
const caregiverDefs = [
  { key: 'sarah', name: 'Sarah Malik', email: 'sarah@memoracare.pk', phone: '+92 300 2345678', password: 'password123', specialization: 'Geriatric Care', notes: 'Senior caregiver with 5 years of experience in dementia care.' },
  { key: 'fatima', name: 'Dr. Fatima Noor', email: 'fatima@memoracare.pk', phone: '+92 333 9876543', password: 'password123', specialization: 'Neurology Nursing', notes: 'Specialised in cognitive rehabilitation and patient monitoring.' },
  { key: 'iraj', name: 'Iraj Shahzad', email: 'Iraj@gmail.com', phone: '+92 301 4567890', password: 'IRAJ123', specialization: "Alzheimer's Care", notes: 'Dedicated caregiver focused on early-stage cognitive support.' },
  { key: 'ayesha', name: 'Ayesha Siddiqui', email: 'ayesha@memoracare.pk', phone: '+92 345 1122334', password: 'password123', specialization: 'Palliative Care', notes: 'Focus on comfort, safety and daily living support.' },
];

// 8 patients with realistic Pakistani profiles.
const patientDefs: any[] = [
  {
    name: 'Ahmed Khan', email: 'ahmed@memoracare.pk', phone: '+92 300 1234567',
    dob: '1955-03-15', gender: 'Male', cnic: '61101-1234567-1', address: 'House 42, Street 7, F-8/3', city: 'Islamabad',
    diagnosis: "Alzheimer's Disease (Early Stage)", doctor: 'Dr. Ahmed Raza', bloodGroup: 'A+',
    allergies: ['Penicillin', 'Dust'], history: "Diagnosed with mild cognitive impairment in 2023, progressed to early Alzheimer's in 2025.",
    contacts: [{ name: 'Bilal Khan', relationship: 'Son', phone: '+92 300 9998877' }, { name: 'Aisha Khan', relationship: 'Daughter', phone: '+92 321 5554433' }],
    caregivers: ['sarah', 'iraj'],
    meds: [
      { name: 'Donepezil (Aricept)', dosage: '10mg', frequency: 'Once daily', times: ['09:00'], instructions: 'Take with breakfast.' },
      { name: 'Memantine (Namenda)', dosage: '5mg', frequency: 'Twice daily', times: ['08:00', '20:00'], instructions: 'With or without food.' },
      { name: 'Vitamin E', dosage: '400 IU', frequency: 'Once daily', times: ['12:00'], instructions: 'Take with lunch.' },
    ],
    routines: [
      { activityName: 'Morning Walk', startTime: '06:30', endTime: '07:00', priority: 'high', description: 'Light 20-minute walk in the garden.' },
      { activityName: 'Quran Recitation', startTime: '05:30', endTime: '06:00', priority: 'high', description: 'Daily recitation after Fajr.' },
      { activityName: 'Memory Exercises', startTime: '10:00', endTime: '10:45', priority: 'high', description: 'Puzzles and photo identification.' },
    ],
    faces: [{ name: 'Bilal Khan', relationship: 'Son' }, { name: 'Aisha Khan', relationship: 'Daughter' }, { name: 'Sarah Malik', relationship: 'Caregiver' }],
    memories: [
      { title: 'Eid gathering with the family', people: ['Bilal Khan', 'Aisha Khan'], location: 'Family home, Islamabad', date: '2025-04-10', description: 'The whole family came over for Eid.' },
      { title: "Bilal's graduation", people: ['Bilal Khan'], location: 'NUST, Islamabad', date: '2019-11-20', description: "Very proud day at Bilal's convocation." },
    ],
  },
  {
    name: 'Nasreen Begum', email: 'nasreen@memoracare.pk', phone: '+92 312 5551234',
    dob: '1948-11-22', gender: 'Female', cnic: '61101-7654321-2', address: 'Apartment 3B, Margalla Towers, G-11', city: 'Islamabad',
    diagnosis: 'Vascular Dementia (Moderate Stage)', doctor: 'Dr. Sadia Hussain', bloodGroup: 'B+',
    allergies: ['Aspirin'], history: 'History of hypertension and two minor strokes. Cognitive decline noticed in 2024.',
    contacts: [{ name: 'Farhan Ali', relationship: 'Son', phone: '+92 333 1112233' }],
    caregivers: ['sarah', 'fatima'],
    meds: [
      { name: 'Rivastigmine (Exelon)', dosage: '6mg', frequency: 'Twice daily', times: ['08:00', '18:00'], instructions: 'Take with meals to reduce nausea.' },
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', times: ['07:00'], instructions: 'For blood pressure.' },
    ],
    routines: [
      { activityName: 'Physical Therapy', startTime: '11:00', endTime: '11:45', priority: 'high', description: 'Balance and motor exercises.' },
      { activityName: 'Afternoon Rest', startTime: '14:00', endTime: '15:00', priority: 'medium', description: 'Quiet rest after lunch.' },
    ],
    faces: [{ name: 'Farhan Ali', relationship: 'Son' }, { name: 'Dr. Fatima Noor', relationship: 'Caregiver' }],
    memories: [{ title: 'Grandson\'s Aqeeqah', people: ['Farhan Ali'], location: 'Islamabad', date: '2022-06-15', description: 'A joyful family celebration.' }],
  },
  {
    name: 'Tariq Mahmood', email: 'tariq@memoracare.pk', phone: '+92 345 7778899',
    dob: '1960-07-08', gender: 'Male', cnic: '61101-9876543-3', address: 'House 15, Street 21, I-10/2', city: 'Islamabad',
    diagnosis: 'Mild Cognitive Impairment (MCI)', doctor: 'Dr. Ahmed Raza', bloodGroup: 'O+',
    allergies: [], history: 'Early signs of memory loss detected during a routine checkup. Under observation.',
    contacts: [{ name: 'Hina Tariq', relationship: 'Wife', phone: '+92 345 6667788' }, { name: 'Usman Tariq', relationship: 'Son', phone: '+92 300 4445566' }],
    caregivers: ['fatima', 'ayesha'],
    meds: [{ name: 'Galantamine (Razadyne)', dosage: '8mg', frequency: 'Once daily', times: ['09:00'], instructions: 'Take with the morning meal.' }],
    routines: [
      { activityName: 'Evening Tea with Family', startTime: '17:00', endTime: '17:30', priority: 'medium', description: 'Social interaction with family.' },
      { activityName: 'Word Games', startTime: '16:00', endTime: '16:30', priority: 'medium', description: 'Crosswords and word recall.' },
    ],
    faces: [{ name: 'Hina Tariq', relationship: 'Wife' }, { name: 'Usman Tariq', relationship: 'Son' }],
    memories: [{ title: 'Northern areas trip', people: ['Hina Tariq'], location: 'Naran, KPK', date: '2018-08-05', description: 'A memorable family holiday in the mountains.' }],
  },
  {
    name: 'Abdul Rehman', email: 'abdul@memoracare.pk', phone: '+92 321 3334455',
    dob: '1952-01-30', gender: 'Male', cnic: '35202-1122334-5', address: 'House 88, Model Town, Block C', city: 'Lahore',
    diagnosis: "Alzheimer's Disease (Moderate Stage)", doctor: 'Dr. Imran Sheikh', bloodGroup: 'AB+',
    allergies: ['Sulfa drugs'], history: 'Progressive memory decline since 2022. Needs help with daily activities.',
    contacts: [{ name: 'Sana Rehman', relationship: 'Daughter', phone: '+92 321 7778866' }],
    caregivers: ['sarah'],
    meds: [
      { name: 'Donepezil (Aricept)', dosage: '5mg', frequency: 'Once daily', times: ['21:00'], instructions: 'Take at bedtime.' },
      { name: 'Quetiapine', dosage: '25mg', frequency: 'Once daily', times: ['21:00'], instructions: 'For agitation; take at night.' },
    ],
    routines: [
      { activityName: 'Gardening', startTime: '08:00', endTime: '08:45', priority: 'medium', description: 'Light gardening for engagement.' },
      { activityName: 'Music Therapy', startTime: '15:00', endTime: '15:30', priority: 'low', description: 'Listening to old favourite songs.' },
    ],
    faces: [{ name: 'Sana Rehman', relationship: 'Daughter' }],
    memories: [{ title: 'Old Lahore days', people: ['Sana Rehman'], location: 'Walled City, Lahore', date: '2015-03-12', description: 'Walking through the streets he grew up in.' }],
  },
  {
    name: 'Zubaida Bibi', email: 'zubaida@memoracare.pk', phone: '+92 300 6677889',
    dob: '1945-09-10', gender: 'Female', cnic: '42101-5566778-9', address: 'Flat 12, Clifton Block 5', city: 'Karachi',
    diagnosis: 'Dementia (Moderate Stage)', doctor: 'Dr. Naila Khan', bloodGroup: 'A-',
    allergies: ['Latex'], history: 'Diagnosed in 2023. Occasional disorientation and confusion in the evenings.',
    contacts: [{ name: 'Kamran Ahmed', relationship: 'Son', phone: '+92 300 2233445' }],
    caregivers: ['fatima'],
    meds: [{ name: 'Memantine (Namenda)', dosage: '10mg', frequency: 'Once daily', times: ['09:00'], instructions: 'Take with breakfast.' }],
    routines: [{ activityName: 'Morning Prayer', startTime: '05:45', endTime: '06:15', priority: 'high', description: 'Fajr prayer and dhikr.' }],
    faces: [{ name: 'Kamran Ahmed', relationship: 'Son' }],
    memories: [{ title: 'Seaside at Clifton', people: ['Kamran Ahmed'], location: 'Clifton Beach, Karachi', date: '2017-12-25', description: 'Evening by the sea with grandchildren.' }],
  },
  {
    name: 'Muhammad Iqbal', email: 'iqbal@memoracare.pk', phone: '+92 333 4455667',
    dob: '1958-05-18', gender: 'Male', cnic: '37405-9988776-1', address: 'House 27, Satellite Town, Block D', city: 'Rawalpindi',
    diagnosis: "Alzheimer's Disease (Early Stage)", doctor: 'Dr. Ahmed Raza', bloodGroup: 'O-',
    allergies: [], history: 'Recently diagnosed. Mild forgetfulness, responds well to routine.',
    contacts: [{ name: 'Ayesha Iqbal', relationship: 'Daughter', phone: '+92 333 8899001' }],
    caregivers: ['iraj'],
    meds: [
      { name: 'Donepezil (Aricept)', dosage: '5mg', frequency: 'Once daily', times: ['09:00'], instructions: 'Take with breakfast.' },
      { name: 'Atorvastatin', dosage: '10mg', frequency: 'Once daily', times: ['21:00'], instructions: 'For cholesterol; take at night.' },
    ],
    routines: [
      { activityName: 'Morning Walk', startTime: '07:00', endTime: '07:30', priority: 'high', description: 'Walk in the park nearby.' },
      { activityName: 'Newspaper Reading', startTime: '08:30', endTime: '09:00', priority: 'medium', description: 'Reading aloud to keep the mind active.' },
    ],
    faces: [{ name: 'Ayesha Iqbal', relationship: 'Daughter' }, { name: 'Iraj Shahzad', relationship: 'Caregiver' }],
    memories: [{ title: 'Retirement ceremony', people: ['Ayesha Iqbal'], location: 'Rawalpindi', date: '2018-04-01', description: 'His farewell after 35 years of service.' }],
  },
  {
    name: 'Khadija Sultana', email: 'khadija@memoracare.pk', phone: '+92 321 5566778',
    dob: '1962-02-14', gender: 'Female', cnic: '33100-4433221-6', address: 'House 5, Peoples Colony No.1', city: 'Faisalabad',
    diagnosis: 'Mild Cognitive Impairment (MCI)', doctor: 'Dr. Rabia Aslam', bloodGroup: 'B-',
    allergies: ['Peanuts'], history: 'Early memory concerns. Independent but monitored by family.',
    contacts: [{ name: 'Bushra Sultana', relationship: 'Sister', phone: '+92 321 1100223' }],
    caregivers: ['iraj'],
    meds: [{ name: 'Rivastigmine (Exelon)', dosage: '4.6mg', frequency: 'Once daily', times: ['09:00'], instructions: 'Patch applied in the morning.' }],
    routines: [{ activityName: 'Cooking Together', startTime: '12:00', endTime: '12:45', priority: 'medium', description: 'Preparing simple meals with family.' }],
    faces: [{ name: 'Bushra Sultana', relationship: 'Sister' }],
    memories: [{ title: 'Family wedding', people: ['Bushra Sultana'], location: 'Faisalabad', date: '2021-02-20', description: 'Dancing at her niece\'s mehndi.' }],
  },
  {
    name: 'Ghulam Hussain', email: 'ghulam@memoracare.pk', phone: '+92 300 9900112',
    dob: '1950-12-05', gender: 'Male', cnic: '36302-7766554-3', address: 'House 19, Gulgasht Colony', city: 'Multan',
    diagnosis: 'Lewy Body Dementia', doctor: 'Dr. Asif Mahmood', bloodGroup: 'A+',
    allergies: [], history: 'Fluctuating attention and occasional visual misperceptions. Diagnosed 2024.',
    contacts: [{ name: 'Rashid Hussain', relationship: 'Son', phone: '+92 300 5544332' }],
    caregivers: ['ayesha'],
    meds: [{ name: 'Rivastigmine (Exelon)', dosage: '6mg', frequency: 'Twice daily', times: ['08:00', '18:00'], instructions: 'Take with meals.' }],
    routines: [{ activityName: 'Evening Walk', startTime: '17:30', endTime: '18:00', priority: 'medium', description: 'Short supervised walk before dinner.' }],
    faces: [{ name: 'Rashid Hussain', relationship: 'Son' }],
    memories: [{ title: 'Mango orchard visit', people: ['Rashid Hussain'], location: 'Multan', date: '2016-07-10', description: 'Summer at the family orchard.' }],
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
const seed = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB.\n');

    // ---- Seed-safety guard ----
    // If the database already has data, do NOT wipe it — your data is permanent.
    // Run "ts-node seed.ts --force" only when you deliberately want to reset.
    const existingUsers = await User.countDocuments();
    const force = process.argv.includes('--force') || process.env.SEED_FORCE === 'true';
    if (existingUsers > 0 && !force) {
      console.log(`Database already has ${existingUsers} users. Skipping seed to protect your data.`);
      console.log('Tip: run "ts-node seed.ts --force" only if you want to wipe and reload the demo data.');
      process.exit(0);
    }

    console.log('Seeding data...\n');
    await Promise.all([
      User.deleteMany({}), Patient.deleteMany({}), Caregiver.deleteMany({}),
      Medication.deleteMany({}), MedicationLog.deleteMany({}),
      Routine.deleteMany({}), RoutineLog.deleteMany({}),
      ChatHistory.deleteMany({}), Alert.deleteMany({}), Note.deleteMany({}),
      Report.deleteMany({}), Contact.deleteMany({}), Memory.deleteMany({}),
      KnownFace.deleteMany({}), RecognitionLog.deleteMany({}),
    ]);
    console.log('Cleared all existing data.');

    // ---- Admin ----
    const adminUser = await User.create({
      name: 'Admin User', email: 'admin@memoracare.pk', password: 'password123',
      phone: '+92 321 1111111', role: 'admin', isActive: true,
    });

    // ---- Caregiver users ----
    const cgUser: Record<string, any> = {};
    for (const c of caregiverDefs) {
      cgUser[c.key] = await User.create({
        name: c.name, email: c.email, password: c.password,
        phone: c.phone, role: 'caregiver', isActive: true,
      });
    }
    console.log(`Created 1 admin + ${caregiverDefs.length} caregivers.`);

    // ---- Patients (+ all their data) ----
    const cgPatients: Record<string, any[]> = {};
    caregiverDefs.forEach((c) => (cgPatients[c.key] = []));

    let pi = 0;
    for (const def of patientDefs) {
      pi++;
      const pUser = await User.create({
        name: def.name, email: def.email, password: 'password123',
        phone: def.phone, role: 'patient', isActive: true,
      });

      const assignedCgIds = def.caregivers.map((k: string) => cgUser[k]._id);
      const patient = await Patient.create({
        user: pUser._id,
        dateOfBirth: new Date(def.dob), gender: def.gender, cnic: def.cnic,
        address: def.address, city: def.city, diagnosis: def.diagnosis,
        doctor: def.doctor, bloodGroup: def.bloodGroup, allergies: def.allergies,
        medicalHistory: def.history, emergencyContacts: def.contacts,
        assignedCaregivers: assignedCgIds,
      });
      def.caregivers.forEach((k: string) => cgPatients[k].push(patient._id));

      const firstCg = cgUser[def.caregivers[0]]._id;

      // Medications + 7 days of logs
      for (const m of def.meds) {
        const med = await Medication.create({
          patient: patient._id, name: m.name, dosage: m.dosage, frequency: m.frequency,
          times: m.times, instructions: m.instructions, startDate: at(60, 9, 0),
          addedBy: firstCg, isActive: true,
        });
        const [hh, mm] = (m.times[0] || '09:00').split(':').map(Number);
        for (let d = 0; d < 7; d++) {
          const status = d === 2 ? 'missed' : 'taken';
          await MedicationLog.create({
            medication: med._id, patient: patient._id,
            scheduledTime: at(d, hh, mm),
            status,
            takenAt: status === 'taken' ? at(d, hh, mm + 10) : undefined,
          });
        }
      }

      // Routines + 7 days of logs
      for (const r of def.routines) {
        const routine = await Routine.create({
          patient: patient._id, activityName: r.activityName, description: r.description,
          startTime: r.startTime, endTime: r.endTime, days: ALL_DAYS, priority: r.priority,
          addedBy: firstCg, isActive: true,
        });
        const [rh, rm] = (r.startTime || '08:00').split(':').map(Number);
        for (let d = 0; d < 7; d++) {
          const status = d === 4 ? 'missed' : 'completed';
          await RoutineLog.create({
            routine: routine._id, patient: patient._id,
            scheduledDate: at(d, rh, rm),
            status,
            completedAt: status === 'completed' ? at(d, rh + 1, 0) : undefined,
          });
        }
      }

      // Known faces
      let fi = 0;
      for (const f of def.faces) {
        fi++;
        await KnownFace.create({
          patient: patient._id, name: f.name, relationship: f.relationship,
          descriptor: fakeDescriptor(pi * 10 + fi), addedBy: firstCg,
          recognitionCount: (fi * 3) % 7, lastSeen: at(fi, 12, 0),
        });
      }

      // Recognition logs (a recognised + an unknown)
      await RecognitionLog.create({
        patient: patient._id, result: 'recognized',
        recognizedPerson: { name: def.faces[0].name, relationship: def.faces[0].relationship },
        confidence: 0.91, createdAt: at(1, 14, 20),
      });
      await RecognitionLog.create({
        patient: patient._id, result: 'unknown', confidence: 0.42, createdAt: at(0, 16, 5),
      });

      // Memories
      for (const mem of def.memories) {
        await Memory.create({
          patient: patient._id, title: mem.title, people: mem.people,
          location: mem.location, date: new Date(mem.date), description: mem.description,
          addedBy: firstCg,
        });
      }

      // Alerts (one open, one resolved)
      await Alert.create({
        patient: patient._id, caregiver: firstCg, type: 'medication_missed',
        severity: 'warning', message: `${def.name} missed ${def.meds[0].name} scheduled earlier today`,
        isResolved: false,
      });
      await Alert.create({
        patient: patient._id, caregiver: firstCg, type: 'routine_missed',
        severity: 'info', message: `${def.name} missed the ${def.routines[0].activityName} routine`,
        isResolved: true, resolvedBy: firstCg, resolvedAt: at(1, 18, 0),
      });

      // Note
      await Note.create({
        patient: patient._id, caregiver: firstCg,
        content: `${def.name.split(' ')[0]} responded well to the daily routine this week. Compliance is good; continue monitoring.`,
      });

      // Chat history
      await ChatHistory.create({
        patient: patient._id, mode: 'text',
        query: 'What medications do I need to take today?',
        response: `You need to take ${def.meds.map((m: any) => `${m.name} at ${m.times[0]}`).join(', ')}.`,
        intent: 'medication_query', confidence: 0.92,
      });
    }
    console.log(`Created ${patientDefs.length} patients with full data (meds, routines, logs, faces, memories, alerts, notes, chat).`);

    // ---- Caregiver profiles (with their assigned patients) ----
    for (const c of caregiverDefs) {
      await Caregiver.create({
        user: cgUser[c.key]._id, specialization: c.specialization,
        assignedPatients: cgPatients[c.key], notes: c.notes,
      });
    }
    console.log('Created caregiver profiles with assignments.');

    // ---- A few contact form submissions (for the admin/contact views) ----
    await Contact.insertMany([
      { name: 'Hamza Tariq', email: 'hamza@example.com', phone: '+92 300 1231231', subject: 'support', message: 'How do I add a new medication reminder for my father?', status: 'new' },
      { name: 'Mariam Yousuf', email: 'mariam@example.com', phone: '+92 321 4564564', subject: 'general', message: 'Does the app support Urdu voice reminders?', status: 'resolved' },
      { name: 'Bilal Ahmed', email: 'bilal@example.com', phone: '+92 333 7897897', subject: 'feedback', message: 'The face recognition feature is very helpful, thank you!', status: 'in_progress' },
    ]);
    console.log('Created 3 contact submissions.');

    // ---- Summary ----
    console.log('\n========================================');
    console.log('  Seed completed successfully!');
    console.log('========================================');
    console.log('\nTest Accounts:');
    console.log('  Admin:      admin@memoracare.pk            / password123');
    console.log('  Caregiver:  sarah@memoracare.pk            / password123');
    console.log('  Caregiver:  fatima@memoracare.pk           / password123');
    console.log('  Caregiver:  Iraj@gmail.com                 / IRAJ123');
    console.log('  Caregiver:  ayesha@memoracare.pk           / password123');
    console.log('  Patients (all / password123):');
    patientDefs.forEach((p) => console.log(`    - ${p.email}`));
    console.log('========================================\n');

    process.exit(0);
  } catch (err: any) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
