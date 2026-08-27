import express from 'express';
const router = express.Router();
import {
  submitContact,
  getAllContacts,
  updateContact,
  deleteContact,
} from '../controllers/contactController';
import { protect, authorize } from '../middleware/auth';
import { contactValidation, handleValidationErrors } from '../middleware/validators';

// Public route (no auth needed)
router.post('/', contactValidation, handleValidationErrors, submitContact);

// Admin-only routes
router.get('/', protect, authorize('admin'), getAllContacts);
router.put('/:id', protect, authorize('admin'), updateContact);
router.delete('/:id', protect, authorize('admin'), deleteContact);

export default router;
