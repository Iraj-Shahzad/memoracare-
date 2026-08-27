import express from 'express';
const router = express.Router();
import {
  sendMessage,
  getChatHistory,
  deleteChatEntry,
} from '../controllers/chatController';
import { protect } from '../middleware/auth';
import { chatValidation, handleValidationErrors } from '../middleware/validators';

router.use(protect); // All routes protected

router.post('/message', chatValidation, handleValidationErrors, sendMessage);
router.get('/patient/:patientId/history', getChatHistory);
router.delete('/:id', deleteChatEntry);

export default router;
