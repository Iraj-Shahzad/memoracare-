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
  getWeeklyCompliance,
} from '../controllers/routineController';
import { protect, authorize } from '../middleware/auth';
import { routineValidation, routineUpdateValidation, routineLogValidation, handleValidationErrors } from '../middleware/validators';

router.use(protect); // All routes protected

router.get('/patient/:patientId', getRoutinesByPatient);
router.get('/patient/:patientId/logs', getRoutineLogs);
router.get('/patient/:patientId/today', getTodayRoutines);
router.get('/patient/:patientId/weekly-compliance', getWeeklyCompliance);
router.post('/', authorize('caregiver', 'admin'), routineValidation, handleValidationErrors, createRoutine);
router.put('/:id', authorize('caregiver', 'admin'), routineUpdateValidation, handleValidationErrors, updateRoutine);
router.delete('/:id', authorize('caregiver', 'admin'), deleteRoutine);
router.post('/:id/log', routineLogValidation, handleValidationErrors, logRoutineCompletion);

export default router;
