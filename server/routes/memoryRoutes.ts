import express from 'express';
const router = express.Router();
import {
  getMemoriesByPatient,
  createMemory,
  deleteMemory,
  upload,
} from '../controllers/memoryController';
import { protect } from '../middleware/auth';

router.use(protect); // All routes protected

router.get('/patient/:patientId', getMemoriesByPatient);
router.post('/', upload, createMemory);
router.delete('/:id', deleteMemory);

export default router;
