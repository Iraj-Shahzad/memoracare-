import express from 'express';
const router = express.Router();
import { register, login, getMe, logout, changePassword } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { registerValidation, loginValidation, handleValidationErrors } from '../middleware/validators';

router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);

export default router;
