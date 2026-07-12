const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getChatHistory,
  deleteChatEntry,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes protected

router.post('/message', sendMessage);
router.get('/patient/:patientId/history', getChatHistory);
router.delete('/:id', deleteChatEntry);

module.exports = router;
