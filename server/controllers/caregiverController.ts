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

// @desc Get my assigned patients
// @route GET /api/caregiver/patients
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

    res.status(200).json({ success: true, count: caregiver.assignedPatients.length, patients: caregiver.assignedPatients });
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

    // Add to both sides of the relationship
    if (!caregiver.assignedPatients.includes(patientId)) {
      caregiver.assignedPatients.push(patientId);
      await caregiver.save();
    }
    if (!patient.assignedCaregivers.includes(req.user.id)) {
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
    const { patient, content } = req.body;

    const note = await Note.create({
      patient,
      caregiver: req.user.id,
      content,
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
    const { content } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, caregiver: req.user.id },
      { content },
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

    const patientIds = caregiver.assignedPatients.map((p) => p._id);

    const [unresolvedAlerts, recentNotes] = await Promise.all([
      Alert.find({ patient: { $in: patientIds }, isResolved: false })
        .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 })
        .limit(10),
      Note.find({ caregiver: req.user.id })
        .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        patientsCount: caregiver.assignedPatients.length,
        patients: caregiver.assignedPatients,
        alerts: unresolvedAlerts,
        recentNotes,
      },
    });
  } catch (err: any) {
    next(err);
  }
};
