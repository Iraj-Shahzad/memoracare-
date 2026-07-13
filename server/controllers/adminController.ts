import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Patient from '../models/Patient';
import Caregiver from '../models/Caregiver';
import Alert from '../models/Alert';
import Medication from '../models/Medication';
import Routine from '../models/Routine';
import Report from '../models/Report';

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
// @route GET /api/admin/health
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
        user: r.generatedBy?.name,
        date: r.createdAt,
      })),
      ...recentUsers.map((u) => ({
        type: 'user_registered',
        description: `New user: ${u.name} (${u.role})`,
        date: u.createdAt,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const paginated = activities.slice((page - 1) * limit, page * limit);

    res.status(200).json({ success: true, count: paginated.length, total: activities.length, activities: paginated });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get login attempts (placeholder)
// @route GET /api/admin/login-attempts
export const getLoginAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
