import express from 'express';
const router = express.Router();
import {
  getRoutinesByPatient,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  logRoutineCompletion,
  getRoutineLogs,
  getTodayRoutines,
} from '../controllers/routineController';
import { protect, authorize } from '../middleware/auth';

router.use(protect); // All routes protected

router.get('/patient/:patientId', getRoutinesByPatient);
router.get('/patient/:patientId/logs', getRoutineLogs);
router.get('/patient/:patientId/today', getTodayRoutines);
router.post('/', authorize('caregiver', 'admin'), createRoutine);
router.put('/:id', authorize('caregiver', 'admin'), updateRoutine);
router.delete('/:id', authorize('caregiver', 'admin'), deleteRoutine);
router.post('/:id/log', logRoutineCompletion);

export default router;
