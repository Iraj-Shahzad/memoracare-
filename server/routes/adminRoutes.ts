import express from 'express';
const router = express.Router();
import {
  getSystemStats,
  getSystemHealth,
  getActivityLog,
  getLoginAttempts,
  updateSettings,
} from '../controllers/adminController';
import { protect, authorize } from '../middleware/auth';

router.use(protect); // All routes protected
router.use(authorize('admin')); // All routes admin only

router.get('/stats', getSystemStats);
router.get('/system-health', getSystemHealth);
router.get('/activity-log', getActivityLog);
router.get('/security/login-attempts', getLoginAttempts);
router.put('/settings', updateSettings);

export default router;
