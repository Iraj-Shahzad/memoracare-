const ChatHistory = require('../models/ChatHistory');
const Patient = require('../models/Patient');

// @desc Send message to AI chatbot
// @route POST /api/chat/message
exports.sendMessage = async (req, res, next) => {
  try {
    const { patientId, query, mode } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a message' });
    }

    // TODO: In Phase 4A, this will call the custom NLP model via Flask API
    // For now, return a placeholder response
    const botResponse = generatePlaceholderResponse(query);

    const chatEntry = await ChatHistory.create({
      patient: patientId,
      mode: mode || 'text',
      query,
      response: botResponse.response,
      intent: botResponse.intent,
      confidence: botResponse.confidence,
    });

    // Emit real-time update
    if (req.io) {
      req.io.to(patientId).emit('chat_message', chatEntry);
    }

    res.status(201).json({ success: true, chat: chatEntry });
  } catch (err) {
    next(err);
  }
};

// @desc Get chat history for a patient
// @route GET /api/chat/patient/:patientId/history
exports.getChatHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const total = await ChatHistory.countDocuments({ patient: patientId });
    const history = await ChatHistory.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: history.length, total, history: history.reverse() });
  } catch (err) {
    next(err);
  }
};

// @desc Delete a chat entry
// @route DELETE /api/chat/:id
exports.deleteChatEntry = async (req, res, next) => {
  try {
    const entry = await ChatHistory.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Chat entry not found' });
    }
    res.status(200).json({ success: true, message: 'Chat entry deleted' });
  } catch (err) {
    next(err);
  }
};

// Placeholder NLP response generator (will be replaced by actual NLP model in Phase 4A)
function generatePlaceholderResponse(query) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('medication') || lowerQuery.includes('medicine')) {
    return { response: 'I can help you with your medications. Please check your Medications page for your current schedule, or ask me a specific question about your prescriptions.', intent: 'medication_query', confidence: 0.85 };
  }
  if (lowerQuery.includes('routine') || lowerQuery.includes('schedule')) {
    return { response: 'Your daily routines help maintain a healthy lifestyle. Check your Routines page to see today\'s schedule.', intent: 'routine_query', confidence: 0.82 };
  }
  if (lowerQuery.includes('help') || lowerQuery.includes('emergency')) {
    return { response: 'If this is an emergency, please use the SOS button or contact your caregiver immediately. I\'m here to help with general questions.', intent: 'emergency', confidence: 0.90 };
  }
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
    return { response: 'Hello! I\'m your MemoraCare assistant. How can I help you today?', intent: 'greeting', confidence: 0.95 };
  }

  return { response: 'I understand your question. Let me help you with that. You can ask me about your medications, routines, or any concerns you have.', intent: 'general', confidence: 0.60 };
}
