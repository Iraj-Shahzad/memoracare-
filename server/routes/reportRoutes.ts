import express from 'express';
const router = express.Router();
import {
  getAllReports,
  getPatientReports,
  generateReport,
  getReport,
  downloadReport,
  deleteReport,
} from '../controllers/reportController';
import { protect } from '../middleware/auth';

router.use(protect); // All routes protected

router.get('/', getAllReports);
router.get('/patient/:patientId', getPatientReports);
router.post('/generate', generateReport);
router.get('/:id', getReport);
router.get('/:id/download', downloadReport);
router.delete('/:id', deleteReport);

export default router;
