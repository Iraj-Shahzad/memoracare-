import { Request, Response, NextFunction } from 'express';
import Report from '../models/Report';
import Patient from '../models/Patient';
import Caregiver from '../models/Caregiver';
import Medication from '../models/Medication';
import MedicationLog from '../models/MedicationLog';
import Routine from '../models/Routine';
import RoutineLog from '../models/RoutineLog';

// @desc Get all reports
// @route GET /api/reports
export const getAllReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const query: any = {};

    if (type) query.type = type;

    // Scope reports based on role
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      if (patient) query.patient = patient._id;
    } else if (req.user.role === 'caregiver') {
      const caregiver = await Caregiver.findOne({ user: req.user.id });
      if (caregiver && caregiver.assignedPatients.length > 0) {
        query.patient = { $in: caregiver.assignedPatients };
      }
    }

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: reports.length, total, reports });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get reports for a specific patient
// @route GET /api/reports/patient/:patientId
export const getPatientReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const reports = await Report.find({ patient: patientId })
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err: any) {
    next(err);
  }
};

// @desc Generate a new report
// @route POST /api/reports/generate
export const generateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, type, format, from, to } = req.body;

    const patient = await Patient.findById(patientId).populate('user', 'name');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const period = {
      from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: to ? new Date(to) : new Date(),
    };

    // Gather report data based on type
    let reportData: any = {};
    const dateQuery = { $gte: period.from, $lte: period.to };

    if (type === 'medication' || type === 'compliance' || type === 'weekly_summary' || type === 'monthly_overview') {
      const medLogs = await MedicationLog.find({ patient: patientId, scheduledTime: dateQuery })
        .populate('medication', 'name dosage');
      const total = medLogs.length;
      const taken = medLogs.filter((l) => l.status === 'taken').length;
      reportData.medication = { total, taken, missed: medLogs.filter((l) => l.status === 'missed').length, complianceRate: total > 0 ? Math.round((taken / total) * 100) : 0 };
    }

    if (type === 'routine' || type === 'weekly_summary' || type === 'monthly_overview') {
      const routineLogs = await RoutineLog.find({ patient: patientId, scheduledDate: dateQuery })
        .populate('routine', 'activityName');
      const total = routineLogs.length;
      const completed = routineLogs.filter((l) => l.status === 'completed').length;
      reportData.routine = { total, completed, missed: routineLogs.filter((l) => l.status === 'missed').length, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }

    const title = `${type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} - ${patient.user.name}`;

    const report = await Report.create({
      generatedBy: req.user.id,
      patient: patientId,
      type,
      title,
      period,
      format: format || 'pdf',
      status: 'ready',
      data: reportData,
    });

    res.status(201).json({ success: true, report });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get single report
// @route GET /api/reports/:id
export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
      .populate('generatedBy', 'name');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.status(200).json({ success: true, report });
  } catch (err: any) {
    next(err);
  }
};

// @desc Download report
// @route GET /api/reports/:id/download
export const downloadReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (report.filePath) {
      return res.download(report.filePath);
    }

    // If no file path, send the report data as JSON
    res.status(200).json({ success: true, report });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete report
// @route DELETE /api/reports/:id
export const deleteReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.status(200).json({ success: true, message: 'Report deleted' });
  } catch (err: any) {
    next(err);
  }
};
