import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import Patient from '../models/Patient';
import User from '../models/User';
import Medication from '../models/Medication';
import Routine from '../models/Routine';
import MedicationLog from '../models/MedicationLog';
import RoutineLog from '../models/RoutineLog';
import Alert from '../models/Alert';
import Caregiver from '../models/Caregiver';
import Memory from '../models/Memory';
import { canAccessPatient } from '../utils/access';

// @desc Get all patients (admin/caregiver)
// @route GET /api/patients
export const getAllPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let query: any = {};

    // If caregiver, only show assigned patients
    if (req.user.role === 'caregiver') {
      const caregiver = await Caregiver.findOne({ user: req.user.id });
      if (caregiver) {
        query._id = { $in: caregiver.assignedPatients };
      } else {
        return res.status(200).json({ success: true, count: 0, patients: [] });
      }
    }

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('user', 'name email phone avatar isActive')
      .populate('assignedCaregivers', 'name email')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: patients.length, total, page: Number(page), patients });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get single patient
// @route GET /api/patients/:id
export const getPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessPatient(req.user, req.params.id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this patient' });
    }

    const patient = await Patient.findById(req.params.id)
      .populate('user', 'name email phone avatar isActive')
      .populate('assignedCaregivers', 'name email phone');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.status(200).json({ success: true, patient });
  } catch (err: any) {
    next(err);
  }
};

// @desc Update patient profile
// @route PUT /api/patients/:id
export const updatePatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessPatient(req.user, req.params.id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this patient' });
    }

    const allowedFields = [
      'dateOfBirth', 'gender', 'cnic', 'address', 'city', 'diagnosis',
      'doctor', 'bloodGroup', 'allergies', 'medicalHistory', 'emergencyContacts',
    ];
    const updateData: any = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const patient = await Patient.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('user', 'name email phone avatar');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Name / email / phone live on the linked User account, not on Patient — so
    // sync those here too (previously they were silently ignored on the profile).
    const { name, email, phone } = req.body;
    const userPatch: any = {};
    if (name !== undefined) userPatch.name = name;
    if (phone !== undefined) userPatch.phone = phone;
    if (email !== undefined) userPatch.email = String(email).toLowerCase();
    if (Object.keys(userPatch).length && (patient as any).user) {
      const uid = (patient as any).user._id || (patient as any).user;
      if (userPatch.email) {
        // Don't let a profile edit collide with another account's email.
        const clash = await User.findOne({ email: userPatch.email, _id: { $ne: uid } }).select('_id');
        if (clash) {
          return res.status(400).json({ success: false, message: 'That email is already in use by another account.' });
        }
      }
      const updatedUser = await User.findByIdAndUpdate(uid, userPatch, { new: true, runValidators: true })
        .select('name email phone avatar');
      if (updatedUser) (patient as any).user = updatedUser; // return the fresh values
    }

    res.status(200).json({ success: true, patient });
  } catch (err: any) {
    next(err);
  }
};

// @desc Export the patient's own data as a PDF document
// @route GET /api/patients/:id/export
export const exportPatientData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessPatient(req.user, req.params.id))) {
      return res.status(403).json({ success: false, message: 'Not authorized to export this patient' });
    }

    const patientId = req.params.id;
    const [patient, medications, routines, memories] = await Promise.all([
      Patient.findById(patientId)
        .populate('user', 'name email phone')
        .populate('assignedCaregivers', 'name email phone'),
      Medication.find({ patient: patientId }),
      Routine.find({ patient: patientId }),
      Memory.find({ patient: patientId }).sort({ createdAt: -1 }),
    ]);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const p: any = patient;
    const patientName = p.user?.name || 'Patient';
    const safeName = patientName.replace(/[^a-z0-9]+/gi, '_');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MemoraCare_MyData_${safeName}.pdf"`);
    doc.pipe(res);

    const TEAL = '#0d9488';
    const INK = '#1a3c34';
    const GREY = '#64748b';
    const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

    // Header
    doc.fillColor(TEAL).fontSize(22).font('Helvetica-Bold').text('MemoraCare');
    doc.moveDown(0.2);
    doc.fillColor(INK).fontSize(16).font('Helvetica-Bold').text('My Personal Data Export');
    doc.moveDown(0.4);
    doc.fillColor(GREY).fontSize(10).font('Helvetica');
    doc.text(`Name: ${patientName}`);
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`);
    doc.moveDown(0.6);
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.6);

    const section = (title: string) => {
      doc.moveDown(0.5).fillColor(INK).fontSize(13).font('Helvetica-Bold').text(title);
      doc.moveDown(0.3);
    };
    const stat = (label: string, value: any) => {
      doc.fillColor(GREY).fontSize(10).font('Helvetica').text(`${label}: `, { continued: true });
      doc.fillColor(INK).font('Helvetica-Bold').text(value == null || value === '' ? '—' : String(value));
    };

    // Profile
    section('Profile');
    stat('Email', p.user?.email);
    stat('Phone', p.user?.phone);
    stat('Date of birth', p.dateOfBirth ? fmtDate(p.dateOfBirth) : '—');
    stat('Gender', p.gender);
    stat('City', p.city);
    stat('Address', p.address);
    stat('CNIC', p.cnic);
    stat('Purpose', p.diagnosis);
    stat('Doctor / Supervisor', p.doctor);
    stat('Blood group', p.bloodGroup);
    stat('Precautions', Array.isArray(p.allergies) ? p.allergies.join(', ') : p.allergies);
    stat('Background / Notes', p.medicalHistory);

    // Emergency contacts
    if (Array.isArray(p.emergencyContacts) && p.emergencyContacts.length) {
      section('Emergency Contacts');
      p.emergencyContacts.forEach((c: any, i: number) => {
        if (!c?.name) return;
        stat(`Contact ${i + 1}`, `${c.name}${c.relationship ? ` (${c.relationship})` : ''} — ${c.phone || '—'}`);
      });
    }

    // Caregiver(s)
    if (Array.isArray(p.assignedCaregivers) && p.assignedCaregivers.length) {
      section('Caregiver');
      p.assignedCaregivers.forEach((c: any) => {
        stat(c.name || 'Caregiver', `${c.email || '—'} — ${c.phone || '—'}`);
      });
    }

    // Medications
    section('Medications');
    if (medications.length) {
      doc.font('Courier').fontSize(9).fillColor(INK);
      doc.text('NAME'.padEnd(24) + 'DOSAGE'.padEnd(14) + 'TIMES');
      doc.fillColor(GREY);
      medications.forEach((m: any) => {
        const times = Array.isArray(m.times) ? m.times.join(', ') : (m.time || '—');
        doc.text(String(m.name || '-').slice(0, 22).padEnd(24) + String(m.dosage || '-').slice(0, 12).padEnd(14) + times);
      });
    } else {
      doc.fillColor(GREY).fontSize(10).font('Helvetica').text('No medications recorded.');
    }

    // Routines
    section('Routines');
    if (routines.length) {
      doc.font('Courier').fontSize(9).fillColor(INK);
      doc.text('ACTIVITY'.padEnd(28) + 'TIME'.padEnd(10) + 'DAYS');
      doc.fillColor(GREY);
      routines.forEach((r: any) => {
        const days = Array.isArray(r.days) ? r.days.map((d: string) => d.slice(0, 3)).join(',') : '—';
        doc.text(String(r.activityName || '-').slice(0, 26).padEnd(28) + String(r.startTime || '-').padEnd(10) + days);
      });
    } else {
      doc.fillColor(GREY).fontSize(10).font('Helvetica').text('No routines recorded.');
    }

    // Memories
    section('Memory Gallery');
    if (memories.length) {
      doc.fillColor(GREY).fontSize(10).font('Helvetica');
      memories.forEach((m: any) => {
        doc.fillColor(INK).font('Helvetica-Bold').text(String(m.title || 'Memory'), { continued: true });
        doc.fillColor(GREY).font('Helvetica').text(`  —  ${fmtDate(m.date || m.createdAt)}${m.location ? ` · ${m.location}` : ''}`);
      });
    } else {
      doc.fillColor(GREY).fontSize(10).font('Helvetica').text('No memories saved.');
    }

    doc.moveDown(2);
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text('Exported from MemoraCare at the account owner\'s request. Contains your personal data — please keep it safe.', { align: 'center' });

    doc.end();
  } catch (err: any) {
    next(err);
  }
};

// @desc Get patient dashboard data
// @route GET /api/patients/:id/dashboard
export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this patient' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [patient, medications, routines, todayMedLogs, todayRoutineLogs, recentAlerts] = await Promise.all([
      Patient.findById(patientId)
        .populate('user', 'name email avatar')
        .populate('assignedCaregivers', 'name phone avatar'),
      Medication.find({ patient: patientId, isActive: true }),
      Routine.find({ patient: patientId, isActive: true }),
      MedicationLog.find({ patient: patientId, scheduledTime: { $gte: today, $lt: tomorrow } }),
      RoutineLog.find({ patient: patientId, scheduledDate: { $gte: today, $lt: tomorrow } }),
      Alert.find({ patient: patientId, isResolved: false }).sort({ createdAt: -1 }).limit(5),
    ]);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const medsTaken = todayMedLogs.filter((l) => l.status === 'taken').length;
    const medsTotal = todayMedLogs.length || medications.length;
    const routinesCompleted = todayRoutineLogs.filter((l) => l.status === 'completed').length;
    const routinesTotal = todayRoutineLogs.length || routines.length;

    // ---- Next upcoming medication / routine time (real, from schedules) ----
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const toMin = (t: string) => {
      const [h, m] = String(t || '').split(':').map(Number);
      return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
    };
    // 12-hour clock with AM/PM (e.g. "4:03 AM", "1:09 PM").
    const fmt = (min: number | null | undefined) => {
      if (min == null) return '—';
      const h24 = Math.floor(min / 60);
      const mm = min % 60;
      const ap = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
    };

    const medTimes = medications.flatMap((m: any) => m.times || []).map(toMin).filter((v): v is number => v !== null).sort((a, b) => a - b);
    const nextMedTime = fmt(medTimes.find((t) => t >= nowMin) ?? medTimes[0]);

    const routineTimes = routines.map((r: any) => toMin(r.startTime)).filter((v): v is number => v !== null).sort((a, b) => a - b);
    const nextRoutine = fmt(routineTimes.find((t) => t >= nowMin) ?? routineTimes[0]);

    // ---- Weekly score: % of medication doses taken over the last 7 days ----
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekMedLogs = await MedicationLog.find({ patient: patientId, scheduledTime: { $gte: weekAgo } });
    const weekTaken = weekMedLogs.filter((l) => l.status === 'taken').length;
    const weeklyScore = weekMedLogs.length ? Math.round((weekTaken / weekMedLogs.length) * 100) : 0;

    // ---- Streak: consecutive days (back from today) with at least one taken dose ----
    const takenDays = new Set(
      weekMedLogs.filter((l) => l.status === 'taken').map((l) => new Date(l.scheduledTime).toDateString())
    );
    let streak = 0;
    const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
    // If today has no taken dose yet, start counting from yesterday so an in-progress day doesn't reset it.
    if (!takenDays.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    while (takenDays.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }

    // Attach each routine's REAL status for today so the dashboard tick persists
    // across navigation (read from the DB, not kept only in memory).
    const routinesWithStatus = routines.map((r: any) => {
      const log = todayRoutineLogs.find((l) => l.routine.toString() === r._id.toString());
      return { ...r.toObject(), todayStatus: log ? log.status : 'upcoming' };
    });

    res.status(200).json({
      success: true,
      dashboard: {
        patient,
        medications: { total: medsTotal, taken: medsTaken, list: medications },
        routines: { total: routinesTotal, completed: routinesCompleted, list: routinesWithStatus },
        nextMedTime,
        nextRoutine,
        weeklyScore,
        streak,
        alerts: recentAlerts,
      },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get patient activity log
// @route GET /api/patients/:id/activity
export const getActivityLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this patient' });
    }

    const { page = 1, limit = 20 } = req.query;

    const [medLogs, routineLogs] = await Promise.all([
      MedicationLog.find({ patient: patientId })
        .populate('medication', 'name dosage')
        .sort({ createdAt: -1 })
        .limit(50),
      RoutineLog.find({ patient: patientId })
        .populate('routine', 'activityName')
        .sort({ createdAt: -1 })
        .limit(50),
    ]);

    // Merge and sort by date
    const activities = [
      ...medLogs.map((l) => ({
        type: 'medication',
        description: `${l.medication?.name || 'Medication'} - ${l.status}`,
        status: l.status,
        date: l.createdAt,
        details: l,
      })),
      ...routineLogs.map((l) => ({
        type: 'routine',
        description: `${l.routine?.activityName || 'Routine'} - ${l.status}`,
        status: l.status,
        date: l.createdAt,
        details: l,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const paginated = activities.slice((page - 1) * limit, page * limit);

    res.status(200).json({ success: true, count: paginated.length, total: activities.length, activities: paginated });
  } catch (err: any) {
    next(err);
  }
};
