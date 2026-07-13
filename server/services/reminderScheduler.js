const cron = require('node-cron');

const Medication = require('../models/Medication');
const Routine = require('../models/Routine');
const MedicationLog = require('../models/MedicationLog');
const RoutineLog = require('../models/RoutineLog');
const Reminder = require('../models/Reminder');
const Alert = require('../models/Alert');

// Minutes past a scheduled time before we consider a dose/routine "missed".
const GRACE_MINUTES = 30;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Parse "09:00" (24h) or "9:00 AM" (12h) into minutes since midnight.
// Returns null if it can't be understood.
function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const str = value.trim();
  const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (minutes > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }
  if (hours > 23) return null;

  return hours * 60 + minutes;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function isMedicationActiveToday(med, now) {
  if (med.isActive === false) return false;
  if (med.startDate && new Date(med.startDate) > now) return false;
  if (med.endDate && new Date(med.endDate) < startOfToday()) return false;
  return true;
}

// ---- Job A: real-time "due now" reminders (runs every minute) ----
async function emitDueReminders(io) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayName = DAY_NAMES[now.getDay()];

  // Medications due this minute
  const medications = await Medication.find({ isActive: true });
  for (const med of medications) {
    if (!isMedicationActiveToday(med, now)) continue;
    for (const t of med.times || []) {
      if (parseTimeToMinutes(t) === nowMinutes) {
        const room = med.patient.toString();
        io.to(room).emit('reminder', {
          kind: 'medication',
          id: med._id,
          name: med.name,
          dosage: med.dosage,
          time: t,
          message: `Time to take ${med.name}${med.dosage ? ` (${med.dosage})` : ''}`,
        });
        await Reminder.create({
          patient: med.patient,
          type: 'medication',
          referenceId: med._id,
          scheduledTime: now,
          message: `Time to take ${med.name}`,
          isDelivered: true,
          deliveredAt: now,
        });
      }
    }
  }

  // Routines due this minute (only on their scheduled weekdays)
  const routines = await Routine.find({ isActive: true });
  for (const routine of routines) {
    const runsToday =
      !routine.days || routine.days.length === 0 || routine.days.includes(todayName);
    if (!runsToday) continue;
    if (parseTimeToMinutes(routine.startTime) === nowMinutes) {
      const room = routine.patient.toString();
      io.to(room).emit('reminder', {
        kind: 'routine',
        id: routine._id,
        name: routine.activityName,
        time: routine.startTime,
        message: `Time for ${routine.activityName}`,
      });
      await Reminder.create({
        patient: routine.patient,
        type: 'routine',
        referenceId: routine._id,
        scheduledTime: now,
        message: `Time for ${routine.activityName}`,
        isDelivered: true,
        deliveredAt: now,
      });
    }
  }
}

// ---- Job B: missed detection (runs every 10 minutes) ----
// One alert per medication/routine per day: if a scheduled time has passed by
// more than the grace period and there is still no log for it today, record a
// "missed" log and raise a caregiver alert.
async function detectMissed(io) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dayStart = startOfToday();
  const dayEnd = endOfToday();
  const todayName = DAY_NAMES[now.getDay()];

  // Missed medications
  const medications = await Medication.find({ isActive: true });
  for (const med of medications) {
    if (!isMedicationActiveToday(med, now)) continue;

    const times = (med.times || [])
      .map(parseTimeToMinutes)
      .filter((m) => m !== null);
    if (times.length === 0) continue;

    const overdue = times.some((t) => nowMinutes > t + GRACE_MINUTES);
    if (!overdue) continue;

    // Already logged today (taken / skipped / missed)? Then don't re-alert.
    const existing = await MedicationLog.findOne({
      medication: med._id,
      scheduledTime: { $gte: dayStart, $lte: dayEnd },
    });
    if (existing) continue;

    await MedicationLog.create({
      medication: med._id,
      patient: med.patient,
      scheduledTime: now,
      status: 'missed',
      notes: 'Auto-marked missed by reminder scheduler',
    });

    await Alert.create({
      patient: med.patient,
      type: 'medication_missed',
      severity: 'warning',
      message: `Missed medication: ${med.name}${med.dosage ? ` (${med.dosage})` : ''}`,
    });

    io.to(med.patient.toString()).emit('alert', {
      type: 'medication_missed',
      severity: 'warning',
      patient: med.patient,
      message: `Missed medication: ${med.name}`,
    });
  }

  // Missed routines
  const routines = await Routine.find({ isActive: true });
  for (const routine of routines) {
    const runsToday =
      !routine.days || routine.days.length === 0 || routine.days.includes(todayName);
    if (!runsToday) continue;

    const startMinutes = parseTimeToMinutes(routine.startTime);
    if (startMinutes === null) continue;
    if (nowMinutes <= startMinutes + GRACE_MINUTES) continue;

    const existing = await RoutineLog.findOne({
      routine: routine._id,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
    });
    if (existing) continue;

    await RoutineLog.create({
      routine: routine._id,
      patient: routine.patient,
      scheduledDate: now,
      status: 'missed',
      notes: 'Auto-marked missed by reminder scheduler',
    });

    await Alert.create({
      patient: routine.patient,
      type: 'routine_missed',
      severity: routine.priority === 'high' ? 'critical' : 'warning',
      message: `Missed routine: ${routine.activityName}`,
    });

    io.to(routine.patient.toString()).emit('alert', {
      type: 'routine_missed',
      severity: routine.priority === 'high' ? 'critical' : 'warning',
      patient: routine.patient,
      message: `Missed routine: ${routine.activityName}`,
    });
  }
}

function start(io) {
  if (!io) {
    console.warn('[reminderScheduler] No socket.io instance provided; reminders disabled.');
    return;
  }

  // Every minute: fire real-time reminders for anything due right now.
  cron.schedule('* * * * *', async () => {
    try {
      await emitDueReminders(io);
    } catch (err) {
      console.error('[reminderScheduler] emitDueReminders error:', err.message);
    }
  });

  // Every 10 minutes: sweep for missed medications/routines.
  cron.schedule('*/10 * * * *', async () => {
    try {
      await detectMissed(io);
    } catch (err) {
      console.error('[reminderScheduler] detectMissed error:', err.message);
    }
  });

  console.log('[reminderScheduler] Started (reminders every minute, missed-check every 10 min).');
}

module.exports = { start, parseTimeToMinutes };
