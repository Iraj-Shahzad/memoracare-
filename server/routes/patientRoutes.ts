import express from 'express';
const router = express.Router();
import {
  getAllPatients,
  getPatient,
  updatePatient,
  getDashboard,
  getActivityLog,
} from '../controllers/patientController';
import { protect, authorize } from '../middleware/auth';

router.use(protect); // All routes protected

router.get('/', authorize('admin', 'caregiver'), getAllPatients);
router.get('/:id', getPatient);
router.put('/:id', updatePatient);
router.get('/:id/dashboard', getDashboard);
router.get('/:id/activity-log', getActivityLog);

export default router;
