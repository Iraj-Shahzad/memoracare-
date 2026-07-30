import { Request, Response, NextFunction } from 'express';
import Patient from '../models/Patient';
import User from '../models/User';
import Medication from '../models/Medication';
import Routine from '../models/Routine';
import MedicationLog from '../models/MedicationLog';
import RoutineLog from '../models/RoutineLog';
import Alert from '../models/Alert';
import Caregiver from '../models/Caregiver';
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

    res.status(200).json({ success: true, patient });
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
    const fmt = (min: number | null | undefined) =>
      min == null ? '—' : `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

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
