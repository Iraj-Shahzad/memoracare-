/**
 * ROUTINE CONTROLLER — daily-activity routine CRUD, completion logging and compliance views.
 *
 * Key concepts: every route is protected by the canAccessPatient IDOR guard (resolved from
 * the routine's own patient on update/delete/log); startTime/endTime are stored as strings
 * and `days` holds weekday names (e.g. "Monday"). update uses an allowedFields whitelist
 * (mass-assignment guard). logRoutineCompletion records status (completed/missed) and emits
 * a Socket.IO routine_update. getWeeklyCompliance builds a 7-day window (incl. today) and
 * computes a per-day completion % from real RoutineLog rows. getTodayRoutines selects active
 * routines whose `days` array includes today's weekday name, then joins today's logs to
 * attach a todayStatus (defaulting to 'upcoming' when no log exists yet).
 * Viva line: "Today's routines are matched by weekday name and merged with the day's logs,
 * and the weekly view is computed day-by-day from real completion records, not stored counts."
 */
import { Request, Response, NextFunction } from 'express';
import Routine from '../models/Routine';
import RoutineLog from '../models/RoutineLog';
import { canAccessPatient } from '../utils/access';

// @desc Get routines for a patient
// @route GET /api/routines/patient/:patientId
export const getRoutinesByPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { active } = req.query;
    const query: any = { patient: patientId };
    if (active !== undefined) query.isActive = active === 'true';

    const routines = await Routine.find(query)
      .populate('addedBy', 'name')
      .sort({ startTime: 1 });

    res.status(200).json({ success: true, count: routines.length, routines });
  } catch (err: any) {
    next(err);
  }
};

// @desc Create routine
// @route POST /api/routines
export const createRoutine = async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (err: any) {
    next(err);
  }
};

// @desc Update routine
// @route PUT /api/routines/:id
export const updateRoutine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await Routine.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Routine not found' });
    }
    if (!(await canAccessPatient(req.user, existing.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    // Whitelist: only these fields can be updated, blocking mass-assignment of anything else.
    const allowedFields = ['activityName', 'description', 'startTime', 'endTime', 'days', 'priority', 'isActive'];
    const updateData: any = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const routine = await Routine.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    res.status(200).json({ success: true, routine });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete routine
// @route DELETE /api/routines/:id
export const deleteRoutine = async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (err: any) {
    next(err);
  }
};

// @desc Log routine completion
// @route POST /api/routines/:id/log
export const logRoutineCompletion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, scheduledDate, notes } = req.body;
    const routine = await Routine.findById(req.params.id);
    if (!routine) {
      return res.status(404).json({ success: false, message: 'Routine not found' });
    }
    if (!(await canAccessPatient(req.user, routine.patient))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    // IDEMPOTENT PER DAY. Marking the same routine complete twice (a double-tap,
    // or a slow network making the patient press again) must not write two rows:
    // getWeeklyCompliance divides by the number of logs for the day, so duplicate
    // rows would inflate the completion percentage above what really happened.
    const when = scheduledDate ? new Date(scheduledDate) : new Date();
    const dayStart = new Date(when); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(when); dayEnd.setHours(23, 59, 59, 999);

    let log = await RoutineLog.findOne({
      routine: routine._id,
      patient: routine.patient,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
    });

    if (log) {
      log.status = status;
      if (notes !== undefined) log.notes = notes;
      if (status === 'completed') log.completedAt = new Date();
      await log.save();
    } else {
      const logData: any = {
        routine: routine._id,
        patient: routine.patient,
        scheduledDate: when,
        status,
        notes,
      };
      if (status === 'completed') logData.completedAt = new Date();
      log = await RoutineLog.create(logData);
    }

    if (req.io) {
      req.io.to(routine.patient.toString()).emit('routine_update', { routineId: routine._id, status });
    }

    res.status(201).json({ success: true, log });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get routine logs
// @route GET /api/routines/patient/:patientId/logs
export const getRoutineLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const { from, to, page = 1, limit = 50 } = req.query;
    const query: any = { patient: patientId };

    if (from || to) {
      query.scheduledDate = {};
      if (from) query.scheduledDate.$gte = new Date(from as string);
      if (to) query.scheduledDate.$lte = new Date(to as string);
    }

    const total = await RoutineLog.countDocuments(query);
    const logs = await RoutineLog.find(query)
      .populate('routine', 'activityName description')
      .sort({ scheduledDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({ success: true, count: logs.length, total, logs });
  } catch (err: any) {
    next(err);
  }
};

// @desc Weekly routine-compliance summary (last 7 days, from real logs)
// @route GET /api/routines/patient/:patientId/weekly-compliance
export const getWeeklyCompliance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - 6); // 7-day window incl. today

    const logs = await RoutineLog.find({ patient: patientId, scheduledDate: { $gte: start } });

    const weekly = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start); day.setDate(start.getDate() + i);
      const nextDay = new Date(day); nextDay.setDate(day.getDate() + 1);
      const dayLogs = logs.filter((l) => {
        const t = new Date(l.scheduledDate).getTime();
        return t >= day.getTime() && t < nextDay.getTime();
      });
      const completed = dayLogs.filter((l) => l.status === 'completed').length;
      weekly.push({
        day: day.toLocaleDateString('en-US', { weekday: 'long' }),
        percentage: dayLogs.length ? Math.round((completed / dayLogs.length) * 100) : 0,
        total: dayLogs.length,
      });
    }

    res.status(200).json({ success: true, weekly });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get today's routines for a patient
// @route GET /api/routines/patient/:patientId/today
export const getTodayRoutines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    if (!(await canAccessPatient(req.user, patientId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    // Match routines scheduled for today by weekday name (days is an array of weekday strings).
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
  } catch (err: any) {
    next(err);
  }
};
