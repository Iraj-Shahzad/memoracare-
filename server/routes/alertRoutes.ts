import express from 'express';
const router = express.Router();
import {
  getAllAlerts,
  getPatientAlerts,
  createAlert,
  resolveAlert,
  deleteAlert,
} from '../controllers/alertController';
import { protect, authorize } from '../middleware/auth';

router.use(protect); // All routes protected

router.get('/', authorize('admin', 'caregiver'), getAllAlerts);
router.get('/patient/:patientId', getPatientAlerts);
router.post('/', createAlert);
router.put('/:id/resolve', authorize('admin', 'caregiver'), resolveAlert);
router.delete('/:id', authorize('admin', 'caregiver'), deleteAlert);

export default router;
