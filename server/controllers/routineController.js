const Routine = require('../models/Routine');
const RoutineLog = require('../models/RoutineLog');
const { canAccessPatient } = require('../utils/access');

// @desc Get routines for a patient
// @route GET /api/routines/patient/:patientId
exports.getRoutinesByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { active } = req.query;
    const query = { patient: patientId };
    if (active !== undefined) query.isActive = active === 'true';

    const routines = await Routine.find(query)
      .populate('addedBy', 'name')
      .sort({ startTime: 1 });

    res.status(200).json({ success: true, count: routines.length, routines });
  } catch (err) {
    next(err);
  }
};

// @desc Create routine
// @route POST /api/routines
exports.createRoutine = async (req, res, next) => {
  try {
    const { patient, activityName, description, startTime, endTime, days, priority } = req.body;

    if (!(await canAccessPatient(req.user, patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const routine = await Routine.create({
      patient,
      activityName,
      description,
      startTime,
      endTime,
      days,
      priority,
      addedBy: req.user.id,
    });

    res.status(201).json({ success: true, routine });
  } catch (err) {
    next(err);
  }
};

// @desc Update routine
// @route PUT /api/routines/:id
exports.updateRoutine = async (req, res, next) => {
  try {
    const existing = await Routine.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Routine not found' });
    }
    if (!(await canAccessPatient(req.user, existing.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const allowedFields = ['activityName', 'description', 'startTime', 'endTime', 'days', 'priority', 'isActive'];
    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const routine = await Routine.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    res.status(200).json({ success: true, routine });
  } catch (err) {
    next(err);
  }
};

// @desc Delete routine
// @route DELETE /api/routines/:id
exports.deleteRoutine = async (req, res, next) => {
  try {
    const routine = await Routine.findById(req.params.id);
    if (!routine) {
      return res.status(404).json({ success: false, message: 'Routine not found' });
    }
    if (!(await canAccessPatient(req.user, routine.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    await routine.deleteOne();
    res.status(200).json({ success: true, message: 'Routine deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc Log routine completion
// @route POST /api/routines/:id/log
exports.logRoutineCompletion = async (req, res, next) => {
  try {
    const { status, scheduledDate, notes } = req.body;
    const routine = await Routine.findById(req.params.id);
    if (!routine) {
      return res.status(404).json({ success: false, message: 'Routine not found' });
    }
    if (!(await canAccessPatient(req.user, routine.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const logData = {
      routine: routine._id,
      patient: routine.patient,
      scheduledDate: scheduledDate || new Date(),
      status,
      notes,
    };

    if (status === 'completed') {
      logData.completedAt = new Date();
    }

    const log = await RoutineLog.create(logData);

    if (req.io) {
      req.io.to(routine.patient.toString()).emit('routine_update', { routineId: routine._id, status });
    }

    res.status(201).json({ success: true, log });
  } catch (err) {
    next(err);
  }
};

// @desc Get routine logs
// @route GET /api/routines/patient/:patientId/logs
exports.getRoutineLogs = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { from, to, page = 1, limit = 50 } = req.query;
    const query = { patient: patientId };

    if (from || to) {
      query.scheduledDate = {};
      if (from) query.scheduledDate.$gte = new Date(from);
      if (to) query.scheduledDate.$lte = new Date(to);
    }

    const total = await RoutineLog.countDocuments(query);
    const logs = await RoutineLog.find(query)
      .populate('routine', 'activityName description')
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: logs.length, total, logs });
  } catch (err) {
    next(err);
  }
};

// @desc Get today's routines for a patient
// @route GET /api/routines/patient/:patientId/today
exports.getTodayRoutines = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    const routines = await Routine.find({
      patient: patientId,
      isActive: true,
      days: dayName,
    }).sort({ startTime: 1 });

    // Get today's logs
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await RoutineLog.find({
      patient: patientId,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const routinesWithStatus = routines.map((routine) => {
      const log = logs.find((l) => l.routine.toString() === routine._id.toString());
      return {
        ...routine.toObject(),
        todayStatus: log ? log.status : 'upcoming',
        logId: log ? log._id : null,
      };
    });

    res.status(200).json({ success: true, count: routinesWithStatus.length, routines: routinesWithStatus });
  } catch (err) {
    next(err);
  }
};
