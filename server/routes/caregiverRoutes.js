const express = require('express');
const router = express.Router();
const {
  getMyPatients,
  assignPatient,
  unassignPatient,
  getPatientOverview,
  getMyNotes,
  createNote,
  updateNote,
  deleteNote,
  getDashboard,
} = require('../controllers/caregiverController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected
router.use(authorize('caregiver')); // All routes caregiver only

router.get('/my-patients', getMyPatients);
router.post('/patients/:patientId/assign', assignPatient);
router.delete('/patients/:patientId/unassign', unassignPatient);
router.get('/patients/:patientId/overview', getPatientOverview);
router.get('/notes', getMyNotes);
router.post('/notes', createNote);
router.put('/notes/:id', updateNote);
router.delete('/notes/:id', deleteNote);
router.get('/dashboard', getDashboard);

module.exports = router;
