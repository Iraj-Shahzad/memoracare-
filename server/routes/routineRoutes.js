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
const { protect } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/patient/:patientId', getRoutinesByPatient);
router.get('/patient/:patientId/logs', getRoutineLogs);
router.get('/patient/:patientId/today', getTodayRoutines);
router.post('/', createRoutine);
router.put('/:id', updateRoutine);
router.delete('/:id', deleteRoutine);
router.post('/:id/log', logRoutineCompletion);

module.exports = router;
