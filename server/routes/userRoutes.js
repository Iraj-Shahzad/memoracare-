const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getStats,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/', authorize('admin'), getAllUsers);
router.get('/stats', authorize('admin'), getStats);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
