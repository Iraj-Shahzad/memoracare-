import { Request, Response, NextFunction } from 'express';
import Patient from '../models/Patient';
import User from '../models/User';
import Medication from '../models/Medication';
import Routine from '../models/Routine';
import MedicationLog from '../models/MedicationLog';
import RoutineLog from '../models/RoutineLog';
import Alert from '../models/Alert';
import Caregiver from '../models/Caregiver';

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
    const patient = await Patient.findById(req.params.id)
      .populate('user', 'name email phone avatar isActive')
      .populate('assignedCaregivers', 'name email');

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [patient, medications, routines, todayMedLogs, todayRoutineLogs, recentAlerts] = await Promise.all([
      Patient.findById(patientId).populate('user', 'name email avatar'),
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

    res.status(200).json({
      success: true,
      dashboard: {
        patient,
        medications: { total: medsTotal, taken: medsTaken, list: medications },
        routines: { total: routinesTotal, completed: routinesCompleted, list: routines },
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
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const paginated = activities.slice((page - 1) * limit, page * limit);

    res.status(200).json({ success: true, count: paginated.length, total: activities.length, activities: paginated });
  } catch (err: any) {
    next(err);
  }
};
