import express from 'express';
const router = express.Router();
import {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getStats,
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

router.use(protect); // All routes protected

router.get('/', authorize('admin'), getAllUsers);
router.post('/', authorize('admin'), createUser);
router.get('/stats', authorize('admin'), getStats);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
