import express from 'express';
const router = express.Router();
import {
  recognizeFace,
  getRecognitionLogs,
  addKnownFace,
  getKnownFaces,
  deleteKnownFace,
  deleteRecognitionLog,
  upload,
} from '../controllers/faceRecognitionController';
import { protect } from '../middleware/auth';

router.use(protect); // All routes protected

router.post('/recognize', upload, recognizeFace);
router.get('/patient/:patientId/logs', getRecognitionLogs);
router.post('/known-faces', upload, addKnownFace);
router.get('/patient/:patientId/known-faces', getKnownFaces);
router.delete('/known-faces/:id', deleteKnownFace);
router.delete('/logs/:id', deleteRecognitionLog);

export default router;
