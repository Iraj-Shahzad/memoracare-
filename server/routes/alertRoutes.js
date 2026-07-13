const express = require('express');
const router = express.Router();
const {
  getAllAlerts,
  getPatientAlerts,
  createAlert,
  resolveAlert,
  deleteAlert,
} = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/', authorize('admin', 'caregiver'), getAllAlerts);
router.get('/patient/:patientId', getPatientAlerts);
router.post('/', createAlert);
router.put('/:id/resolve', authorize('admin', 'caregiver'), resolveAlert);
router.delete('/:id', authorize('admin', 'caregiver'), deleteAlert);

module.exports = router;
