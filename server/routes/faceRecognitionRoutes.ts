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
import { knownFaceValidation, handleValidationErrors } from '../middleware/validators';

router.use(protect); // All routes protected

router.post('/recognize', upload, recognizeFace);
router.get('/patient/:patientId/logs', getRecognitionLogs);
// `upload` first, so multer has populated req.body from the multipart form.
router.post('/known-faces', upload, knownFaceValidation, handleValidationErrors, addKnownFace);
router.get('/patient/:patientId/known-faces', getKnownFaces);
router.delete('/known-faces/:id', deleteKnownFace);
router.delete('/logs/:id', deleteRecognitionLog);

export default router;
