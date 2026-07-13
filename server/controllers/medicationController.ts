import { Request, Response, NextFunction } from 'express';
import Medication from '../models/Medication';
import MedicationLog from '../models/MedicationLog';
import Patient from '../models/Patient';
import { canAccessPatient } from '../utils/access';

// @desc Get medications for a patient
// @route GET /api/medications/patient/:patientId
export const getMedicationsByPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { active } = req.query;
    const query: any = { patient: patientId };
    if (active !== undefined) query.isActive = active === 'true';

    const medications = await Medication.find(query)
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: medications.length, medications });
  } catch (err: any) {
    next(err);
  }
};

// @desc Create medication
// @route POST /api/medications
export const createMedication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patient, name, dosage, frequency, times, instructions, startDate, endDate } = req.body;

    if (!(await canAccessPatient(req.user, patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const medication = await Medication.create({
      patient,
      name,
      dosage,
      frequency,
      times,
      instructions,
      startDate,
      endDate,
      addedBy: req.user.id,
    });

    res.status(201).json({ success: true, medication });
  } catch (err: any) {
    next(err);
  }
};

// @desc Update medication
// @route PUT /api/medications/:id
export const updateMedication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await Medication.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }
    if (!(await canAccessPatient(req.user, existing.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const allowedFields = ['name', 'dosage', 'frequency', 'times', 'instructions', 'startDate', 'endDate', 'isActive'];
    const updateData: any = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const medication = await Medication.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    res.status(200).json({ success: true, medication });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete medication
// @route DELETE /api/medications/:id
export const deleteMedication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medication = await Medication.findById(req.params.id);
    if (!medication) {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }
    if (!(await canAccessPatient(req.user, medication.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    await medication.deleteOne();
    res.status(200).json({ success: true, message: 'Medication deleted' });
  } catch (err: any) {
    next(err);
  }
};

// @desc Log medication status (taken/missed/skipped)
// @route POST /api/medications/:id/log
export const logMedicationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, scheduledTime, notes } = req.body;
    const medication = await Medication.findById(req.params.id);
    if (!medication) {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }
    if (!(await canAccessPatient(req.user, medication.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const logData: any = {
      medication: medication._id,
      patient: medication.patient,
      scheduledTime: scheduledTime || new Date(),
      status,
      notes,
    };

    if (status === 'taken') {
      logData.takenAt = new Date();
    }

    const log = await MedicationLog.create(logData);

    // Emit real-time update if io is available
    if (req.io) {
      req.io.to(medication.patient.toString()).emit('medication_update', { medicationId: medication._id, status });
    }

    res.status(201).json({ success: true, log });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get medication logs for a patient
// @route GET /api/medications/patient/:patientId/logs
export const getMedicationLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { from, to, page = 1, limit = 50 } = req.query;
    const query: any = { patient: patientId };

    if (from || to) {
      query.scheduledTime = {};
      if (from) query.scheduledTime.$gte = new Date(from);
      if (to) query.scheduledTime.$lte = new Date(to);
    }

    const total = await MedicationLog.countDocuments(query);
    const logs = await MedicationLog.find(query)
      .populate('medication', 'name dosage frequency')
      .sort({ scheduledTime: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: logs.length, total, logs });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get compliance stats for a patient
// @route GET /api/medications/patient/:patientId/compliance
export const getComplianceStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { days = 30 } = req.query;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Number(days));

    const logs = await MedicationLog.find({
      patient: patientId,
      scheduledTime: { $gte: fromDate },
    });

    const total = logs.length;
    const taken = logs.filter((l) => l.status === 'taken').length;
    const missed = logs.filter((l) => l.status === 'missed').length;
    const skipped = logs.filter((l) => l.status === 'skipped').length;
    const complianceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    res.status(200).json({
      success: true,
      stats: { total, taken, missed, skipped, complianceRate, period: `${days} days` },
    });
  } catch (err: any) {
    next(err);
  }
};
