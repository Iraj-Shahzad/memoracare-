import express from 'express';
const router = express.Router();
import { register, login, googleAuth, getMe, logout, changePassword, deleteMe, forgotPassword, resetPassword } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { registerValidation, loginValidation, handleValidationErrors } from '../middleware/validators';

router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);
router.delete('/me', protect, deleteMe);

export default router;
