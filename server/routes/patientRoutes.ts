import express from 'express';
const router = express.Router();
import {
  getAllPatients,
  getPatient,
  updatePatient,
  getDashboard,
  getActivityLog,
  exportPatientData,
} from '../controllers/patientController';
import { protect, authorize } from '../middleware/auth';
import { updatePatientValidation, handleValidationErrors } from '../middleware/validators';

router.use(protect); // All routes protected

router.get('/', authorize('admin', 'caregiver'), getAllPatients);
router.get('/:id', getPatient);
router.put('/:id', updatePatientValidation, handleValidationErrors, updatePatient);
router.get('/:id/dashboard', getDashboard);
router.get('/:id/activity-log', getActivityLog);
router.get('/:id/export', exportPatientData);

export default router;
