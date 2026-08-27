import express from 'express';
const router = express.Router();
import {
  getMemoriesByPatient,
  createMemory,
  deleteMemory,
  upload,
} from '../controllers/memoryController';
import { protect } from '../middleware/auth';
import { memoryValidation, handleValidationErrors } from '../middleware/validators';

router.use(protect); // All routes protected

router.get('/patient/:patientId', getMemoriesByPatient);
// `upload` must run first: the text fields arrive as multipart, so they are not
// on req.body until multer has parsed the request.
router.post('/', upload, memoryValidation, handleValidationErrors, createMemory);
router.delete('/:id', deleteMemory);

export default router;
