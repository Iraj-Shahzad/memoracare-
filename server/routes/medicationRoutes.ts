import express from 'express';
const router = express.Router();
import {
  getMedicationsByPatient,
  createMedication,
  updateMedication,
  deleteMedication,
  logMedicationStatus,
  getMedicationLogs,
  getComplianceStats,
} from '../controllers/medicationController';
import { protect, authorize } from '../middleware/auth';

router.use(protect); // All routes protected

router.get('/patient/:patientId', getMedicationsByPatient);
router.get('/patient/:patientId/logs', getMedicationLogs);
router.get('/patient/:patientId/compliance', getComplianceStats);
router.post('/', authorize('caregiver', 'admin'), createMedication);
router.put('/:id', authorize('caregiver', 'admin'), updateMedication);
router.delete('/:id', authorize('caregiver', 'admin'), deleteMedication);
router.post('/:id/log', logMedicationStatus);

export default router;
