/**
 * ADMIN CONTROLLER — platform-wide dashboards, health, backup and activity feed.
 *
 * Key concepts: getSystemStats runs parallel countDocuments() (Promise.all) plus
 * newUsersThisMonth (createdAt within last 30 days); getSystemHealth reports process
 * uptime/memoryUsage and DB status via mongoose.connection.readyState === 1; getBackup
 * dumps the main collections as downloadable JSON with .select('-password') so hashes
 * are NEVER exported; getActivityLog merges recent alerts + reports + new users into one
 * feed sorted by date then paginated in-memory. getLoginAttempts and updateSettings are
 * honest TODO placeholders (no persistence yet — they return canned/echoed responses).
 * These routes are admin-only, enforced by authorize('admin') RBAC at the route layer.
 * Viva line: "The admin endpoints are read-only oversight tools; the backup deliberately
 * strips password hashes, and login-attempt tracking is a stub I flagged for future work."
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Patient from '../models/Patient';
import Caregiver from '../models/Caregiver';
import Alert from '../models/Alert';
import Medication from '../models/Medication';
import Routine from '../models/Routine';
import Report from '../models/Report';
import Memory from '../models/Memory';

// @desc Get system stats
// @route GET /api/admin/stats
export const getSystemStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, patients, caregivers, activeAlerts, totalMedications, totalRoutines, totalReports] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'caregiver' }),
      Alert.countDocuments({ isResolved: false }),
      Medication.countDocuments(),
      Routine.countDocuments(),
      Report.countDocuments(),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        patients,
        caregivers,
        activeAlerts,
        totalMedications,
        totalRoutines,
        totalReports,
        newUsersThisMonth,
      },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get system health
// @route GET /api/admin/system-health
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Mongoose readyState: 1 === connected; anything else is treated as down.
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.status(200).json({
      success: true,
      health: {
        server: 'running',
        database: dbStatus,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc  Download a full data backup (JSON export of the main collections)
// @route GET /api/admin/backup
export const getBackup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, patients, caregivers, medications, routines, memories, alerts, reports] = await Promise.all([
      User.find().select('-password').lean(),   // never export password hashes
      Patient.find().lean(),
      Caregiver.find().lean(),
      Medication.find().lean(),
      Routine.find().lean(),
      Memory.find().lean(),
      Alert.find().lean(),
      Report.find().lean(),
    ]);
    const backup = {
      app: 'MemoryCare',
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length, patients: patients.length, caregivers: caregivers.length,
        medications: medications.length, routines: routines.length, memories: memories.length,
        alerts: alerts.length, reports: reports.length,
      },
      collections: { users, patients, caregivers, medications, routines, memories, alerts, reports },
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="memoracare-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.status(200).send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    next(err);
  }
};

// @desc Get activity log (recent actions across the system)
// @route GET /api/admin/activity-log
export const getActivityLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    // Gather recent activity from multiple collections
    const [recentAlerts, recentReports, recentUsers] = await Promise.all([
      Alert.find()
        .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 })
        .limit(20),
      Report.find()
        .populate('generatedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(20),
      User.find()
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const activities = [
      ...recentAlerts.map((a) => ({
        type: 'alert',
        description: `Alert: ${a.message}`,
        severity: a.severity,
        date: a.createdAt,
      })),
      ...recentReports.map((r) => ({
        type: 'report',
        description: `Report generated: ${r.title}`,
        // Cast: generatedBy is populated, but Mongoose types it as an ObjectId.
        user: (r.generatedBy as any)?.name,
        date: r.createdAt,
      })),
      ...recentUsers.map((u) => ({
        type: 'user_registered',
        description: `New user: ${u.name} (${u.role})`,
        date: u.createdAt,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // newest-first across all sources

    // Pagination is done in memory because the feed is a merge of three collections.
    const paginated = activities.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

    res.status(200).json({ success: true, count: paginated.length, total: activities.length, activities: paginated });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get login attempts (placeholder)
// @route GET /api/admin/login-attempts
export const getLoginAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // PLACEHOLDER: no persistence yet — returns an empty list until a dedicated model exists.
    // TODO: Implement login attempt tracking with a dedicated model
    res.status(200).json({
      success: true,
      message: 'Login attempt tracking will be implemented with a dedicated ActivityLog model',
      attempts: [],
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Update system settings (placeholder)
// @route PUT /api/admin/settings
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // PLACEHOLDER: does not persist — simply echoes req.body back until a Settings model exists.
    // TODO: Implement settings model for persistence
    res.status(200).json({
      success: true,
      message: 'Settings updated (placeholder - will persist with Settings model)',
      settings: req.body,
    });
  } catch (err: any) {
    next(err);
  }
};
