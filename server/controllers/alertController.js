const Alert = require('../models/Alert');
const Patient = require('../models/Patient');
const Caregiver = require('../models/Caregiver');
const { canAccessPatient } = require('../utils/access');

// @desc Get all alerts (admin/caregiver)
// @route GET /api/alerts
exports.getAllAlerts = async (req, res, next) => {
  try {
    const { type, severity, resolved, page = 1, limit = 20 } = req.query;
    const query = {};

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
  } catch (err) {
    next(err);
  }
};

// @desc Get alerts for a specific patient
// @route GET /api/alerts/patient/:patientId
exports.getPatientAlerts = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { resolved } = req.query;
    const query = { patient: patientId };
    if (resolved !== undefined) query.isResolved = resolved === 'true';

    const alerts = await Alert.find(query)
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: alerts.length, alerts });
  } catch (err) {
    next(err);
  }
};

// @desc Create an alert
// @route POST /api/alerts
exports.createAlert = async (req, res, next) => {
  try {
    const { patient, type, severity, message } = req.body;

    if (!(await canAccessPatient(req.user, patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const alert = await Alert.create({
      patient,
      caregiver: req.user.id,
      type,
      severity,
      message,
    });

    // Emit real-time alert
    if (req.io && patient) {
      req.io.to(patient).emit('alert', { type, severity, message });
    }

    res.status(201).json({ success: true, alert });
  } catch (err) {
    next(err);
  }
};

// @desc Resolve an alert
// @route PUT /api/alerts/:id/resolve
exports.resolveAlert = async (req, res, next) => {
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
  } catch (err) {
    next(err);
  }
};

// @desc Delete an alert
// @route DELETE /api/alerts/:id
exports.deleteAlert = async (req, res, next) => {
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
  } catch (err) {
    next(err);
  }
};
