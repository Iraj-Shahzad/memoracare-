const express = require('express');
const router = express.Router();
const {
  getAllReports,
  getPatientReports,
  generateReport,
  getReport,
  downloadReport,
  deleteReport,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/', getAllReports);
router.get('/patient/:patientId', getPatientReports);
router.post('/generate', generateReport);
router.get('/:id', getReport);
router.get('/:id/download', downloadReport);
router.delete('/:id', deleteReport);

module.exports = router;
