import { Request, Response, NextFunction } from 'express';
import Alert from '../models/Alert';
import Patient from '../models/Patient';
import Caregiver from '../models/Caregiver';
import User from '../models/User';
import { canAccessPatient } from '../utils/access';
import { sendMail, emailLayout } from '../utils/mailer';

// @desc Get all alerts (admin/caregiver)
// @route GET /api/alerts
export const getAllAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, severity, resolved, page = 1, limit = 20 } = req.query;
    const query: any = {};

    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (resolved !== undefined) query.isResolved = resolved === 'true';

    // If caregiver, only show alerts for their assigned patients
    if (req.user.role === 'caregiver') {
      const caregiver = await Caregiver.findOne({ user: req.user.id });
      if (caregiver && caregiver.assignedPatients.length > 0) {
        query.patient = { $in: caregiver.assignedPatients };
      } else {
        return res.status(200).json({ success: true, count: 0, alerts: [] });
      }
    }

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
      .populate('caregiver', 'name')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: alerts.length, total, alerts });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get alerts for a specific patient
// @route GET /api/alerts/patient/:patientId
export const getPatientAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { resolved } = req.query;
    const query: any = { patient: patientId };
    if (resolved !== undefined) query.isResolved = resolved === 'true';

    const alerts = await Alert.find(query)
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: alerts.length, alerts });
  } catch (err: any) {
    next(err);
  }
};

// @desc Create an alert
// @route POST /api/alerts
export const createAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patient, type, severity, message } = req.body;

    if (!(await canAccessPatient(req.user, patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    // Route the alert to the patient's assigned caregiver(s), not the patient.
    const patientDoc: any = await Patient.findById(patient).populate('user', 'name');
    const caregiverIds: any[] = patientDoc?.assignedCaregivers || [];

    const alert = await Alert.create({
      patient,
      caregiver: caregiverIds[0] || undefined,
      type,
      severity,
      message,
    });

    // Real-time: notify the assigned CAREGIVER(s) in their own room — an SOS
    // must reach the caregiver, not pop up on the patient's own screen.
    const patientName = patientDoc?.user?.name || 'Patient';
    if (req.io) {
      caregiverIds.forEach((cgId) => {
        req.io.to(cgId.toString()).emit('alert', { type, severity, message, patientName });
      });
    }

    // Also email the assigned caregiver(s) so an SOS / missed-dose reaches them
    // even when the app is closed (best-effort; no-op if SMTP isn't configured).
    if (caregiverIds.length) {
      const caregivers = await User.find({ _id: { $in: caregiverIds } }).select('email name');
      caregivers.forEach((cg: any) => {
        if (!cg?.email) return;
        sendMail({
          to: cg.email,
          subject: `MemoraCare alert${severity === 'critical' ? ' (URGENT)' : ''}: ${patientName}`,
          html: emailLayout('New patient alert',
            `<p><b>Patient:</b> ${patientName}</p>
             <p><b>Type:</b> ${type} &nbsp; <b>Severity:</b> ${severity}</p>
             <p><b>Message:</b> ${message}</p>
             <p>Please open MemoraCare to review and respond.</p>`),
        }).catch(() => {});
      });
    }

    res.status(201).json({ success: true, alert });
  } catch (err: any) {
    next(err);
  }
};

// @desc Resolve an alert
// @route PUT /api/alerts/:id/resolve
export const resolveAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await Alert.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    if (!(await canAccessPatient(req.user, existing.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedBy: req.user.id, resolvedAt: new Date() },
      { new: true }
    );

    res.status(200).json({ success: true, alert });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete an alert
// @route DELETE /api/alerts/:id
export const deleteAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    if (!(await canAccessPatient(req.user, alert.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    await alert.deleteOne();
    res.status(200).json({ success: true, message: 'Alert deleted' });
  } catch (err: any) {
    next(err);
  }
};
