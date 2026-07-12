/**
 * MemoryCare Database Seed Script
 *
 * Usage: node seed.js
 *
 * Creates sample data for testing:
 * - 1 Admin user
 * - 2 Caregiver users + profiles
 * - 3 Patient users + profiles
 * - Medications, routines, alerts, notes for each patient
 *
 * WARNING: This will clear ALL existing data before seeding.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Patient = require('./models/Patient');
const Caregiver = require('./models/Caregiver');
const Medication = require('./models/Medication');
const MedicationLog = require('./models/MedicationLog');
const Routine = require('./models/Routine');
const RoutineLog = require('./models/RoutineLog');
const ChatHistory = require('./models/ChatHistory');
const Alert = require('./models/Alert');
const Note = require('./models/Note');
const Report = require('./models/Report');
const Contact = require('./models/Contact');

const connectDB = require('./config/db');

const seed = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB. Seeding data...\n');

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Caregiver.deleteMany({}),
      Medication.deleteMany({}),
      MedicationLog.deleteMany({}),
      Routine.deleteMany({}),
      RoutineLog.deleteMany({}),
      ChatHistory.deleteMany({}),
      Alert.deleteMany({}),
      Note.deleteMany({}),
      Report.deleteMany({}),
      Contact.deleteMany({}),
    ]);
    console.log('Cleared all existing data.');

    // ==================== USERS ====================
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@memoracare.pk',
      password: hashedPassword,
      phone: '+92 321 1111111',
      role: 'admin',
      isActive: true,
    });

    const caregiverUser1 = await User.create({
      name: 'Sarah Malik',
      email: 'sarah@memoracare.pk',
      password: hashedPassword,
      phone: '+92 300 2345678',
      role: 'caregiver',
      isActive: true,
    });

    const caregiverUser2 = await User.create({
      name: 'Dr. Fatima Noor',
      email: 'fatima@memoracare.pk',
      password: hashedPassword,
      phone: '+92 333 9876543',
      role: 'caregiver',
      isActive: true,
    });

    const patientUser1 = await User.create({
      name: 'Ahmed Khan',
      email: 'ahmed@memoracare.pk',
      password: hashedPassword,
      phone: '+92 300 1234567',
      role: 'patient',
      isActive: true,
    });

    const patientUser2 = await User.create({
      name: 'Nasreen Begum',
      email: 'nasreen@memoracare.pk',
      password: hashedPassword,
      phone: '+92 312 5551234',
      role: 'patient',
      isActive: true,
    });

    const patientUser3 = await User.create({
      name: 'Tariq Mahmood',
      email: 'tariq@memoracare.pk',
      password: hashedPassword,
      phone: '+92 345 7778899',
      role: 'patient',
      isActive: true,
    });

    console.log('Created 6 users (1 admin, 2 caregivers, 3 patients).');

    // ==================== PATIENTS ====================
    const patient1 = await Patient.create({
      user: patientUser1._id,
      dateOfBirth: new Date('1955-03-15'),
      gender: 'Male',
      cnic: '61101-1234567-1',
      address: 'House 42, Street 7, F-8/3',
      city: 'Islamabad',
      diagnosis: "Alzheimer's Disease (Early Stage)",
      doctor: 'Dr. Ahmed Raza',
      bloodGroup: 'A+',
      allergies: ['Penicillin', 'Dust'],
      medicalHistory: 'Diagnosed with mild cognitive impairment in 2023, progressed to early Alzheimer\'s in 2025.',
      emergencyContacts: [
        { name: 'Bilal Khan', relationship: 'Son', phone: '+92 300 9998877' },
        { name: 'Aisha Khan', relationship: 'Daughter', phone: '+92 321 5554433' },
      ],
      assignedCaregivers: [caregiverUser1._id],
    });

    const patient2 = await Patient.create({
      user: patientUser2._id,
      dateOfBirth: new Date('1948-11-22'),
      gender: 'Female',
      cnic: '61101-7654321-2',
      address: 'Apartment 3B, Margalla Towers, G-11',
      city: 'Islamabad',
      diagnosis: 'Vascular Dementia (Moderate Stage)',
      doctor: 'Dr. Sadia Hussain',
      bloodGroup: 'B+',
      allergies: ['Aspirin'],
      medicalHistory: 'History of hypertension and two minor strokes. Cognitive decline noticed in 2024.',
      emergencyContacts: [
        { name: 'Farhan Ali', relationship: 'Son', phone: '+92 333 1112233' },
      ],
      assignedCaregivers: [caregiverUser1._id, caregiverUser2._id],
    });

    const patient3 = await Patient.create({
      user: patientUser3._id,
      dateOfBirth: new Date('1960-07-08'),
      gender: 'Male',
      cnic: '61101-9876543-3',
      address: 'House 15, Street 21, I-10/2',
      city: 'Islamabad',
      diagnosis: 'Mild Cognitive Impairment (MCI)',
      doctor: 'Dr. Ahmed Raza',
      bloodGroup: 'O+',
      allergies: [],
      medicalHistory: 'Early signs of memory loss detected during routine checkup. Under observation.',
      emergencyContacts: [
        { name: 'Hina Tariq', relationship: 'Wife', phone: '+92 345 6667788' },
        { name: 'Usman Tariq', relationship: 'Son', phone: '+92 300 4445566' },
      ],
      assignedCaregivers: [caregiverUser2._id],
    });

    console.log('Created 3 patient profiles.');

    // ==================== CAREGIVERS ====================
    const caregiver1 = await Caregiver.create({
      user: caregiverUser1._id,
      specialization: 'Geriatric Care',
      assignedPatients: [patient1._id, patient2._id],
      notes: 'Senior caregiver with 5 years of experience in dementia care.',
    });

    const caregiver2 = await Caregiver.create({
      user: caregiverUser2._id,
      specialization: 'Neurology Nursing',
      assignedPatients: [patient2._id, patient3._id],
      notes: 'Specialized in cognitive rehabilitation and patient monitoring.',
    });

    console.log('Created 2 caregiver profiles.');

    // ==================== MEDICATIONS ====================
    const med1 = await Medication.create({
      patient: patient1._id,
      name: 'Donepezil (Aricept)',
      dosage: '10mg',
      frequency: 'Once daily',
      times: ['09:00'],
      instructions: 'Take with breakfast. Do not crush or chew.',
      startDate: new Date('2025-06-01'),
      addedBy: caregiverUser1._id,
      isActive: true,
    });

    const med2 = await Medication.create({
      patient: patient1._id,
      name: 'Memantine (Namenda)',
      dosage: '5mg',
      frequency: 'Twice daily',
      times: ['08:00', '20:00'],
      instructions: 'Take with or without food.',
      startDate: new Date('2025-08-15'),
      addedBy: caregiverUser1._id,
      isActive: true,
    });

    const med3 = await Medication.create({
      patient: patient1._id,
      name: 'Vitamin E',
      dosage: '400 IU',
      frequency: 'Once daily',
      times: ['12:00'],
      instructions: 'Take with lunch.',
      startDate: new Date('2025-06-01'),
      addedBy: caregiverUser1._id,
      isActive: true,
    });

    const med4 = await Medication.create({
      patient: patient2._id,
      name: 'Rivastigmine (Exelon)',
      dosage: '6mg',
      frequency: 'Twice daily',
      times: ['08:00', '18:00'],
      instructions: 'Take with meals to reduce nausea.',
      startDate: new Date('2025-09-01'),
      addedBy: caregiverUser2._id,
      isActive: true,
    });

    const med5 = await Medication.create({
      patient: patient2._id,
      name: 'Amlodipine',
      dosage: '5mg',
      frequency: 'Once daily',
      times: ['07:00'],
      instructions: 'For blood pressure management.',
      startDate: new Date('2024-01-15'),
      addedBy: caregiverUser2._id,
      isActive: true,
    });

    const med6 = await Medication.create({
      patient: patient3._id,
      name: 'Galantamine (Razadyne)',
      dosage: '8mg',
      frequency: 'Once daily',
      times: ['09:00'],
      instructions: 'Take with morning meal.',
      startDate: new Date('2026-01-10'),
      addedBy: caregiverUser2._id,
      isActive: true,
    });

    console.log('Created 6 medications.');

    // ==================== MEDICATION LOGS (last 7 days) ====================
    const medLogs = [];
    const today = new Date();
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(today);
      day.setDate(day.getDate() - dayOffset);

      // Patient 1 - med1 (once daily)
      const status1 = dayOffset < 2 ? 'taken' : dayOffset === 3 ? 'missed' : 'taken';
      medLogs.push({
        medication: med1._id,
        patient: patient1._id,
        scheduledTime: new Date(day.setHours(9, 0, 0, 0)),
        status: status1,
        takenAt: status1 === 'taken' ? new Date(day.setHours(9, 15, 0, 0)) : undefined,
      });

      // Patient 1 - med2 morning
      medLogs.push({
        medication: med2._id,
        patient: patient1._id,
        scheduledTime: new Date(day.setHours(8, 0, 0, 0)),
        status: dayOffset === 5 ? 'missed' : 'taken',
        takenAt: dayOffset !== 5 ? new Date(day.setHours(8, 10, 0, 0)) : undefined,
      });
    }

    await MedicationLog.insertMany(medLogs);
    console.log(`Created ${medLogs.length} medication logs.`);

    // ==================== ROUTINES ====================
    const routine1 = await Routine.create({
      patient: patient1._id,
      activityName: 'Morning Walk',
      description: 'Light 20-minute walk in the garden for fresh air and exercise.',
      startTime: '06:30',
      endTime: '07:00',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      priority: 'high',
      addedBy: caregiverUser1._id,
      isActive: true,
    });

    const routine2 = await Routine.create({
      patient: patient1._id,
      activityName: 'Quran Recitation',
      description: 'Daily Quran recitation after Fajr prayer for spiritual peace.',
      startTime: '05:30',
      endTime: '06:00',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      priority: 'high',
      addedBy: caregiverUser1._id,
      isActive: true,
    });

    const routine3 = await Routine.create({
      patient: patient1._id,
      activityName: 'Memory Exercises',
      description: 'Cognitive training: puzzles, word games, and photo identification.',
      startTime: '10:00',
      endTime: '10:45',
      days: ['Monday', 'Wednesday', 'Friday'],
      priority: 'high',
      addedBy: caregiverUser1._id,
      isActive: true,
    });

    const routine4 = await Routine.create({
      patient: patient1._id,
      activityName: 'Afternoon Nap',
      description: 'Rest period after lunch. Keep room quiet and comfortable.',
      startTime: '14:00',
      endTime: '15:00',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      priority: 'medium',
      addedBy: caregiverUser1._id,
      isActive: true,
    });

    const routine5 = await Routine.create({
      patient: patient2._id,
      activityName: 'Physical Therapy',
      description: 'Guided exercises for motor function and balance.',
      startTime: '11:00',
      endTime: '11:45',
      days: ['Tuesday', 'Thursday', 'Saturday'],
      priority: 'high',
      addedBy: caregiverUser2._id,
      isActive: true,
    });

    const routine6 = await Routine.create({
      patient: patient3._id,
      activityName: 'Evening Tea with Family',
      description: 'Social interaction with family members. Discuss daily events.',
      startTime: '17:00',
      endTime: '17:30',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      priority: 'medium',
      addedBy: caregiverUser2._id,
      isActive: true,
    });

    console.log('Created 6 routines.');

    // ==================== ROUTINE LOGS ====================
    const routineLogs = [];
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(today);
      day.setDate(day.getDate() - dayOffset);

      routineLogs.push({
        routine: routine1._id,
        patient: patient1._id,
        scheduledDate: new Date(day.setHours(6, 30, 0, 0)),
        status: dayOffset === 2 ? 'missed' : 'completed',
        completedAt: dayOffset !== 2 ? new Date(day.setHours(7, 0, 0, 0)) : undefined,
      });

      routineLogs.push({
        routine: routine4._id,
        patient: patient1._id,
        scheduledDate: new Date(day.setHours(14, 0, 0, 0)),
        status: 'completed',
        completedAt: new Date(day.setHours(15, 0, 0, 0)),
      });
    }

    await RoutineLog.insertMany(routineLogs);
    console.log(`Created ${routineLogs.length} routine logs.`);

    // ==================== CHAT HISTORY ====================
    const chatEntries = [
      {
        patient: patient1._id,
        mode: 'text',
        query: 'What medications do I need to take today?',
        response: 'Good morning, Ahmed! Today you need to take Donepezil (10mg) at 9:00 AM, Memantine (5mg) at 8:00 AM and 8:00 PM, and Vitamin E (400 IU) at 12:00 PM with lunch.',
        intent: 'medication_query',
        confidence: 0.92,
      },
      {
        patient: patient1._id,
        mode: 'text',
        query: 'What is my routine for today?',
        response: 'Your routines for today include: Morning Walk at 6:30 AM, Quran Recitation at 5:30 AM, Memory Exercises at 10:00 AM, and Afternoon Nap at 2:00 PM.',
        intent: 'routine_query',
        confidence: 0.89,
      },
      {
        patient: patient1._id,
        mode: 'text',
        query: 'Who is my doctor?',
        response: 'Your primary doctor is Dr. Ahmed Raza. If you need to contact the clinic, please ask your caregiver Sarah Malik for assistance.',
        intent: 'general',
        confidence: 0.75,
      },
      {
        patient: patient2._id,
        mode: 'text',
        query: 'Hello',
        response: 'Hello, Nasreen! I\'m your MemoryCare assistant. How can I help you today?',
        intent: 'greeting',
        confidence: 0.95,
      },
    ];

    await ChatHistory.insertMany(chatEntries);
    console.log(`Created ${chatEntries.length} chat history entries.`);

    // ==================== ALERTS ====================
    const alerts = [
      {
        patient: patient1._id,
        caregiver: caregiverUser1._id,
        type: 'medication_missed',
        severity: 'warning',
        message: 'Ahmed Khan missed Donepezil (10mg) scheduled for 9:00 AM',
        isResolved: false,
      },
      {
        patient: patient1._id,
        caregiver: caregiverUser1._id,
        type: 'routine_missed',
        severity: 'info',
        message: 'Ahmed Khan missed Morning Walk routine',
        isResolved: true,
        resolvedBy: caregiverUser1._id,
        resolvedAt: new Date(),
      },
      {
        patient: patient2._id,
        caregiver: caregiverUser1._id,
        type: 'sos',
        severity: 'critical',
        message: 'SOS alert triggered by Nasreen Begum',
        isResolved: false,
      },
      {
        patient: patient2._id,
        type: 'face_unknown',
        severity: 'warning',
        message: 'An unrecognized face was detected near Nasreen Begum',
        isResolved: false,
      },
    ];

    await Alert.insertMany(alerts);
    console.log(`Created ${alerts.length} alerts.`);

    // ==================== NOTES ====================
    const notes = [
      {
        patient: patient1._id,
        caregiver: caregiverUser1._id,
        content: 'Ahmed seems more alert in the mornings after his walk. Recommend continuing the routine and potentially extending the duration by 5 minutes.',
      },
      {
        patient: patient1._id,
        caregiver: caregiverUser1._id,
        content: 'Family visit today improved his mood significantly. He recognized his son Bilal immediately but took a moment with his daughter Aisha.',
      },
      {
        patient: patient2._id,
        caregiver: caregiverUser2._id,
        content: 'Blood pressure reading slightly elevated today (140/90). Monitoring closely. Medication compliance has been good this week.',
      },
      {
        patient: patient3._id,
        caregiver: caregiverUser2._id,
        content: 'Tariq completed all memory exercises successfully today. Showing improvement in word recall tests. Family reports he is more engaged at home.',
      },
    ];

    await Note.insertMany(notes);
    console.log(`Created ${notes.length} notes.`);

    // ==================== SUMMARY ====================
    console.log('\n========================================');
    console.log('  Seed completed successfully!');
    console.log('========================================');
    console.log('\nTest Accounts (password: password123):');
    console.log('  Admin:     admin@memoracare.pk');
    console.log('  Caregiver: sarah@memoracare.pk');
    console.log('  Caregiver: fatima@memoracare.pk');
    console.log('  Patient:   ahmed@memoracare.pk');
    console.log('  Patient:   nasreen@memoracare.pk');
    console.log('  Patient:   tariq@memoracare.pk');
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
