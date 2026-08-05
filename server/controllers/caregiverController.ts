/**
 * CAREGIVER CONTROLLER — everything a caregiver does with their assigned patients.
 *
 * Key concepts: caregiver-can-only-see-assigned-patients (the Caregiver.assignedPatients
 * link is the source of truth); canAccessPatient IDOR guard on getPatientOverview and
 * createNote so a caregiver can't reach a patient they aren't assigned to; assignPatient
 * blocks "stealing" a patient already owned by another caregiver (unassigned-or-mine only);
 * both sides of the caregiver<->patient relationship are kept in sync on assign/unassign;
 * note CRUD is scoped by { caregiver: req.user.id } so you can only touch your own notes;
 * dashboard/patients compute medication compliance (% taken over 7 days) from real logs.
 * Viva line: "A caregiver only ever sees and edits data for patients explicitly assigned
 * to them — every patient-scoped route is gated by canAccessPatient or the assignment link."
 */
import { Request, Response, NextFunction } from 'express';
import Caregiver from '../models/Caregiver';
import Patient from '../models/Patient';
import User from '../models/User';
import Note from '../models/Note';
import Alert from '../models/Alert';
import Medication from '../models/Medication';
import MedicationLog from '../models/MedicationLog';
import Routine from '../models/Routine';
import RoutineLog from '../models/RoutineLog';
import { canAccessPatient } from '../utils/access';

// Shared helpers so the patients list and the dashboard compute identical
// fields — a single source of truth means new patients are always consistent.
const initialsOf = (name: string) => (name || '').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
const ageOf = (dob: any) => (dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0);
const CARD_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#dc2626', '#0891b2'];

// @desc Get my assigned patients (computed, display-ready shape)
// @route GET /api/caregiver/my-patients
export const getMyPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user.id })
      .populate({
        path: 'assignedPatients',
        populate: { path: 'user', select: 'name email phone avatar isActive' },
      });

    if (!caregiver) {
      return res.status(404).json({ success: false, message: 'Caregiver profile not found' });
    }

    const patients: any[] = caregiver.assignedPatients as any[];
    const patientIds = patients.map((p) => p._id);

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const [weekMedLogs, recentLogs] = await Promise.all([
      MedicationLog.find({ patient: { $in: patientIds }, scheduledTime: { $gte: weekAgo } }),
      // MedicationLog has no updatedAt; order by the real scheduledTime field.
      MedicationLog.find({ patient: { $in: patientIds } }).sort({ scheduledTime: -1 }),
    ]);

    // Per-patient medication compliance (% taken, last 7 days) + last activity.
    const compByPatient: Record<string, number> = {};
    const lastActivityByPatient: Record<string, string> = {};
    for (const pid of patientIds) {
      const key = pid.toString();
      const logs = weekMedLogs.filter((l) => l.patient.toString() === key);
      const taken = logs.filter((l) => l.status === 'taken').length;
      compByPatient[key] = logs.length ? Math.round((taken / logs.length) * 100) : 0;
      // Most recent real timestamp we actually have on a log.
      const last = recentLogs.find((l) => l.patient.toString() === key) as any;
      const raw = last ? (last.takenAt || last.scheduledTime || last.createdAt) : null;
      const dt = raw ? new Date(raw) : null;
      lastActivityByPatient[key] = dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString() : 'N/A';
    }

    const out = patients.map((p, i) => {
      const name = p.user?.name || 'Unnamed patient';
      const key = p._id.toString();
      return {
        _id: p._id,
        name,
        email: p.user?.email || '',
        phone: p.user?.phone || '',
        diagnosis: p.diagnosis || 'Not specified',
        age: ageOf(p.dateOfBirth),
        gender: p.gender || '',
        city: p.city || '',
        compliance: compByPatient[key] ?? 0,
        initials: initialsOf(name),
        color: CARD_COLORS[i % CARD_COLORS.length],
        lastActivity: lastActivityByPatient[key] || 'N/A',
        status: p.user?.isActive === false ? 'inactive' : 'active',
      };
    });

    res.status(200).json({ success: true, count: out.length, patients: out });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get my own caregiver profile
// @route GET /api/caregiver/profile
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user.id }).populate('user', 'name email phone role settings');
    if (!caregiver) {
      return res.status(404).json({ success: false, message: 'Caregiver profile not found' });
    }
    const u: any = caregiver.user;
    res.status(200).json({
      success: true,
      profile: {
        name: u?.name || '', email: u?.email || '', phone: u?.phone || '',
        role: u?.role || 'caregiver',
        specialization: caregiver.specialization || '', notes: caregiver.notes || '',
        settings: u?.settings || {},
      },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Save my UI/notification preferences (Settings page)
// @route PUT /api/caregiver/settings
export const updateMySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;
    if (typeof settings !== 'object' || settings === null) {
      return res.status(400).json({ success: false, message: 'settings object is required' });
    }
    const user = await User.findByIdAndUpdate(req.user.id, { settings }, { new: true });
    res.status(200).json({ success: true, settings: user?.get('settings') || {} });
  } catch (err: any) {
    next(err);
  }
};

// @desc Update my own caregiver profile (User name/phone + Caregiver fields)
// @route PUT /api/caregiver/profile
export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, specialization, notes } = req.body;
    if (name !== undefined && String(name).trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Name must be at least 3 characters' });
    }

    const userUpdate: any = {};
    if (name !== undefined) userUpdate.name = String(name).trim();
    if (phone !== undefined) userUpdate.phone = phone;
    if (Object.keys(userUpdate).length) {
      await User.findByIdAndUpdate(req.user.id, userUpdate, { new: true, runValidators: true });
    }

    const cgUpdate: any = {};
    if (specialization !== undefined) cgUpdate.specialization = specialization;
    if (notes !== undefined) cgUpdate.notes = notes;
    const caregiver = await Caregiver.findOneAndUpdate({ user: req.user.id }, cgUpdate, { new: true })
      .populate('user', 'name email phone role');

    if (!caregiver) {
      return res.status(404).json({ success: false, message: 'Caregiver profile not found' });
    }
    const u: any = caregiver.user;
    res.status(200).json({
      success: true,
      profile: {
        name: u?.name || '', email: u?.email || '', phone: u?.phone || '',
        role: u?.role || 'caregiver',
        specialization: caregiver.specialization || '', notes: caregiver.notes || '',
      },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc List enrolled caregivers/doctors (for assignment dropdowns)
// @route GET /api/caregiver/team
export const getTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caregivers = await Caregiver.find().populate('user', 'name email');
    const team = caregivers
      .map((c: any) => ({
        _id: c._id,
        name: c.user?.name || '',
        specialization: c.specialization || '',
      }))
      .filter((c) => c.name);
    res.status(200).json({ success: true, count: team.length, team });
  } catch (err: any) {
    next(err);
  }
};

// @desc Create a new patient account and assign to this caregiver
// @route POST /api/caregiver/patients
export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, diagnosis, dateOfBirth, gender, phone, city, doctor } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    // Create the login account (password is hashed by the User pre-save hook).
    const newUser = await User.create({
      name, email: String(email).toLowerCase(), password, role: 'patient', phone,
    });

    // Create the patient profile, pre-linked to this caregiver.
    const patient = await Patient.create({
      user: newUser._id,
      diagnosis: diagnosis || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      city: city || undefined,
      doctor: doctor || undefined,
      assignedCaregivers: [req.user.id],
    });

    // Link the caregiver -> patient side of the relationship.
    const caregiver = await Caregiver.findOne({ user: req.user.id });
    if (caregiver && !caregiver.assignedPatients.some((id) => id.toString() === patient._id.toString())) {
      caregiver.assignedPatients.push(patient._id as any);
      await caregiver.save();
    }

    res.status(201).json({ success: true, message: 'Patient created and assigned', patientId: patient._id });
  } catch (err: any) {
    next(err);
  }
};

// @desc Assign a patient to caregiver
// @route POST /api/caregiver/patients/:patientId/assign
export const assignPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const caregiver = await Caregiver.findOne({ user: req.user.id });
    if (!caregiver) {
      return res.status(404).json({ success: false, message: 'Caregiver profile not found' });
    }

    // Prevent "stealing" another caregiver's patient: a caregiver may only
    // assign a patient who is currently unassigned (or already theirs). Admins
    // aren't restricted here (they don't use this route).
    const already = (patient.assignedCaregivers || []).map((id) => id.toString());
    if (already.length && !already.includes(req.user.id.toString())) {
      return res.status(403).json({ success: false, message: 'This patient is already assigned to another caregiver.' });
    }

    // Add to both sides of the relationship.
    // Compare as strings: assignedPatients holds ObjectIds, patientId is a string,
    // so a raw .includes() would always be false and create duplicates.
    if (!caregiver.assignedPatients.some((id) => id.toString() === patientId)) {
      caregiver.assignedPatients.push(patientId as any);
      await caregiver.save();
    }
    if (!patient.assignedCaregivers.some((id) => id.toString() === req.user.id.toString())) {
      patient.assignedCaregivers.push(req.user.id);
      await patient.save();
    }

    res.status(200).json({ success: true, message: 'Patient assigned successfully' });
  } catch (err: any) {
    next(err);
  }
};

// @desc Unassign a patient
// @route DELETE /api/caregiver/patients/:patientId/assign
export const unassignPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const caregiver = await Caregiver.findOne({ user: req.user.id });
    if (caregiver) {
      caregiver.assignedPatients = caregiver.assignedPatients.filter((id) => id.toString() !== patientId);
      await caregiver.save();
    }

    const patient = await Patient.findById(patientId);
    if (patient) {
      patient.assignedCaregivers = patient.assignedCaregivers.filter((id) => id.toString() !== req.user.id);
      await patient.save();
    }

    res.status(200).json({ success: true, message: 'Patient unassigned successfully' });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get overview for a specific patient
// @route GET /api/caregiver/patients/:patientId/overview
export const getPatientOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    // Only the assigned caregiver (or admin) may view a patient's overview.
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [patient, medications, routines, todayMedLogs, todayRoutineLogs, unresolvedAlerts] = await Promise.all([
      Patient.findById(patientId).populate('user', 'name email phone avatar'),
      Medication.find({ patient: patientId, isActive: true }),
      Routine.find({ patient: patientId, isActive: true }),
      MedicationLog.find({ patient: patientId, scheduledTime: { $gte: today, $lt: tomorrow } }),
      RoutineLog.find({ patient: patientId, scheduledDate: { $gte: today, $lt: tomorrow } }),
      Alert.find({ patient: patientId, isResolved: false }).sort({ createdAt: -1 }),
    ]);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.status(200).json({
      success: true,
      overview: {
        patient,
        medications: { total: medications.length, todayLogs: todayMedLogs },
        routines: { total: routines.length, todayLogs: todayRoutineLogs },
        alerts: unresolvedAlerts,
      },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get caregiver's notes
// @route GET /api/caregiver/notes
export const getMyNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, page = 1, limit = 20 } = req.query;
    const query: any = { caregiver: req.user.id };
    if (patientId) query.patient = patientId;

    const total = await Note.countDocuments(query);
    const notes = await Note.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: notes.length, total, notes });
  } catch (err: any) {
    next(err);
  }
};

// @desc Create a note
// @route POST /api/caregiver/notes
export const createNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patient, content, category } = req.body;
    // Only allow notes on a patient this caregiver is assigned to.
    if (!(await canAccessPatient(req.user, patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const note = await Note.create({
      patient,
      caregiver: req.user.id,
      content,
      category: category || 'observation',
    });

    res.status(201).json({ success: true, note });
  } catch (err: any) {
    next(err);
  }
};

// @desc Update a note
// @route PUT /api/caregiver/notes/:id
export const updateNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, category } = req.body;
    const update: any = {};
    if (content !== undefined) update.content = content;
    if (category !== undefined) update.category = category;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, caregiver: req.user.id },
      update,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found or unauthorized' });
    }

    res.status(200).json({ success: true, note });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete a note
// @route DELETE /api/caregiver/notes/:id
export const deleteNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, caregiver: req.user.id });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found or unauthorized' });
    }
    res.status(200).json({ success: true, message: 'Note deleted' });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get caregiver dashboard data
// @route GET /api/caregiver/dashboard
export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user.id })
      .populate({
        path: 'assignedPatients',
        populate: { path: 'user', select: 'name email avatar' },
      });

    if (!caregiver) {
      return res.status(404).json({ success: false, message: 'Caregiver profile not found' });
    }

    const patients: any[] = caregiver.assignedPatients as any[];
    const patientIds = patients.map((p) => p._id);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

    const [weekMedLogs, todayRoutineLogs, unresolvedAlerts, recentNotes, allMeds] = await Promise.all([
      MedicationLog.find({ patient: { $in: patientIds }, scheduledTime: { $gte: weekAgo } }),
      RoutineLog.find({ patient: { $in: patientIds }, scheduledDate: { $gte: today, $lt: tomorrow } }),
      Alert.find({ patient: { $in: patientIds }, isResolved: false })
        .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 }).limit(10),
      Note.find({ caregiver: req.user.id })
        .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 }).limit(5),
      Medication.find({ patient: { $in: patientIds }, isActive: true }),
    ]);

    // Uses the shared initialsOf / ageOf / CARD_COLORS helpers above so the
    // dashboard and the patients list compute identical fields (single source).

    // Per-patient medication compliance (% taken over the last 7 days).
    const compByPatient: Record<string, number> = {};
    for (const pid of patientIds) {
      const logs = weekMedLogs.filter((l) => l.patient.toString() === pid.toString());
      const taken = logs.filter((l) => l.status === 'taken').length;
      compByPatient[pid.toString()] = logs.length ? Math.round((taken / logs.length) * 100) : 0;
    }

    const patientsOut = patients.map((p, i) => {
      const name = p.user?.name || 'Unnamed patient';
      return {
        _id: p._id, name, diagnosis: p.diagnosis || '', age: ageOf(p.dateOfBirth),
        compliance: compByPatient[p._id.toString()] ?? 0,
        initials: initialsOf(name), color: CARD_COLORS[i % CARD_COLORS.length],
      };
    });

    const totalTaken = weekMedLogs.filter((l) => l.status === 'taken').length;
    const medsCompliance = weekMedLogs.length ? Math.round((totalTaken / weekMedLogs.length) * 100) : 0;
    const routinesCompleted = todayRoutineLogs.filter((l) => l.status === 'completed').length;

    const alertsOut = unresolvedAlerts.map((a: any) => ({
      _id: a._id, type: a.type, severity: a.severity,
      patientName: a.patient?.user?.name || '',
      message: a.message || '', description: '',
      timeAgo: new Date(a.createdAt).toLocaleDateString(),
    }));

    const notesOut = recentNotes.map((n: any) => ({
      _id: n._id, patientName: n.patient?.user?.name || '',
      initials: initialsOf(n.patient?.user?.name || ''), color: '#0d9488',
      content: n.content, date: new Date(n.createdAt).toLocaleDateString(),
    }));

    const complianceTable = allMeds.map((m: any) => {
      const p = patients.find((pp) => pp._id.toString() === m.patient.toString());
      const name = p?.user?.name || '';
      const comp = compByPatient[m.patient.toString()] ?? 0;
      return {
        patientName: name, initials: initialsOf(name), color: '#0d9488',
        medication: m.name, schedule: (m.times || []).join(', ') || m.frequency || '',
        today: '-', weekly: comp, status: comp >= 80 ? 'good' : comp >= 60 ? 'fair' : 'poor',
      };
    });

    res.status(200).json({
      success: true,
      totalPatients: patients.length,
      medsCompliance,
      missedAlerts: unresolvedAlerts.length,
      routinesToday: { completed: routinesCompleted, total: todayRoutineLogs.length },
      patients: patientsOut,
      alerts: alertsOut,
      complianceTable,
      notes: notesOut,
    });
  } catch (err: any) {
    next(err);
  }
};
