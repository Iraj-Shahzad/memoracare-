const express = require('express');
const router = express.Router();
const {
  getSystemStats,
  getSystemHealth,
  getActivityLog,
  getLoginAttempts,
  updateSettings,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected
router.use(authorize('admin')); // All routes admin only

router.get('/stats', getSystemStats);
router.get('/system-health', getSystemHealth);
router.get('/activity-log', getActivityLog);
router.get('/security/login-attempts', getLoginAttempts);
router.put('/settings', updateSettings);

module.exports = router;
