const express = require('express');
const router = express.Router();
const {
  getRoutinesByPatient,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  logRoutineCompletion,
  getRoutineLogs,
  getTodayRoutines,
} = require('../controllers/routineController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/patient/:patientId', getRoutinesByPatient);
router.get('/patient/:patientId/logs', getRoutineLogs);
router.get('/patient/:patientId/today', getTodayRoutines);
router.post('/', authorize('caregiver', 'admin'), createRoutine);
router.put('/:id', authorize('caregiver', 'admin'), updateRoutine);
router.delete('/:id', authorize('caregiver', 'admin'), deleteRoutine);
router.post('/:id/log', logRoutineCompletion);

module.exports = router;
