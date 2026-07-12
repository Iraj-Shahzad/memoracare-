const express = require('express');
const router = express.Router();
const {
  getMedicationsByPatient,
  createMedication,
  updateMedication,
  deleteMedication,
  logMedicationStatus,
  getMedicationLogs,
  getComplianceStats,
} = require('../controllers/medicationController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/patient/:patientId', getMedicationsByPatient);
router.get('/patient/:patientId/logs', getMedicationLogs);
router.get('/patient/:patientId/compliance', getComplianceStats);
router.post('/', createMedication);
router.put('/:id', updateMedication);
router.delete('/:id', deleteMedication);
router.post('/:id/log', logMedicationStatus);

module.exports = router;
