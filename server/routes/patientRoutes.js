const express = require('express');
const router = express.Router();
const {
  getAllPatients,
  getPatient,
  updatePatient,
  getDashboard,
  getActivityLog,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/', authorize('admin', 'caregiver'), getAllPatients);
router.get('/:id', getPatient);
router.put('/:id', updatePatient);
router.get('/:id/dashboard', getDashboard);
router.get('/:id/activity-log', getActivityLog);

module.exports = router;
