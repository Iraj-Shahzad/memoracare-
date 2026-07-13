import express from 'express';
const router = express.Router();
import {
  getMyPatients,
  assignPatient,
  unassignPatient,
  getPatientOverview,
  getMyNotes,
  createNote,
  updateNote,
  deleteNote,
  getDashboard,
} from '../controllers/caregiverController';
import { protect, authorize } from '../middleware/auth';

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

export default router;
