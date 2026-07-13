import { Request, Response, NextFunction } from 'express';
import ChatHistory from '../models/ChatHistory';
import Patient from '../models/Patient';
import Medication from '../models/Medication';
import Routine from '../models/Routine';
import { canAccessPatient } from '../utils/access';

// URL of the custom Python/Flask intent-classifier service (Phase 4).
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

// Ask the trained model to classify the message. Returns
// { intent, confidence, response } or null if the service is unreachable.
async function classifyIntent(message: any) {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
      // Don't hang the request if the ML service is slow/down.
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err: any) {
    console.error('[chat] ML service unreachable:', err.message);
    return null;
  }
}

// Turn a classified intent into a personalized reply using the patient's real
// data. `base` is the generic response the model returned for that intent.
async function buildReply(intent: any, base: any, patientId: any) {
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];

  switch (intent) {
    case 'medication_query':
    case 'medication_time': {
      const meds = await Medication.find({ patient: patientId, isActive: true }).select('name dosage times');
      if (!meds.length) return "You don't have any medications on file right now. Please check with your caregiver.";
      const lines = meds.map((m) => {
        const times = m.times && m.times.length ? ` at ${m.times.join(', ')}` : '';
        const dose = m.dosage ? ` (${m.dosage})` : '';
        return `• ${m.name}${dose}${times}`;
      });
      const lead = intent === 'medication_time'
        ? 'Here are the times for your medicines:'
        : 'Here are your medicines:';
      return `${lead}\n${lines.join('\n')}\n\nRemember to mark each one as taken on your Medications page.`;
    }

    case 'routine_query': {
      const routines = await Routine.find({ patient: patientId, isActive: true }).select('activityName startTime days');
      const today = routines.filter((r) => !r.days || r.days.length === 0 || r.days.includes(todayName));
      if (!today.length) return "You don't have any routines scheduled for today. Enjoy your day!";
      const lines = today
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
        .map((r) => `• ${r.activityName}${r.startTime ? ` at ${r.startTime}` : ''}`);
      return `Here is your routine for today:\n${lines.join('\n')}`;
    }

    case 'name_query': {
      const patient = await Patient.findById(patientId).populate('user', 'name');
      const name = patient?.user?.name;
      return name ? `Your name is ${name}. It's good to see you!` : base;
    }

    case 'date_time': {
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Today is ${dateStr}, and the time is ${timeStr}.`;
    }

    case 'family_query': {
      const patient = await Patient.findById(patientId).select('emergencyContacts');
      const contacts = patient?.emergencyContacts || [];
      if (!contacts.length) return 'I don\'t have your family details on file yet. Your caregiver can add them for you.';
      const lines = contacts.map((c) => `• ${c.name}${c.relationship ? ` (${c.relationship})` : ''}${c.phone ? ` — ${c.phone}` : ''}`);
      return `Here are the people close to you:\n${lines.join('\n')}`;
    }

    case 'location': {
      const patient = await Patient.findById(patientId).select('address city');
      if (patient?.address || patient?.city) {
        return `You live at ${[patient.address, patient.city].filter(Boolean).join(', ')}. You are safe.`;
      }
      return base;
    }

    default:
      // greeting, thanks, goodbye, feeling, emergency, help, appointment, fallback
      return base;
  }
}

// @desc Send message to AI chatbot
// @route POST /api/chat/message
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Accept both new and old field names so nothing breaks.
    const patientId = req.body.patientId || req.body.patient;
    const query = req.body.query || req.body.message;
    const mode = req.body.mode || 'text';

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a message' });
    }
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Please provide a patient' });
    }

    // Access control: only the patient / their caregiver / admin may chat.
    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    let intent = 'general';
    let confidence = null;
    let responseText;

    const prediction = await classifyIntent(query);
    if (prediction && prediction.intent) {
      intent = prediction.intent;
      confidence = prediction.confidence ?? null;
      responseText = await buildReply(intent, prediction.response, patientId);
    } else {
      // ML service offline → rule-based fallback so the app still works.
      const fallback = generateFallbackResponse(query);
      responseText = fallback.response;
      intent = fallback.intent;
      confidence = fallback.confidence;
    }

    const chatEntry = await ChatHistory.create({
      patient: patientId,
      mode,
      query,
      response: responseText,
      intent,
      confidence,
    });

    if (req.io) {
      req.io.to(patientId.toString()).emit('chat_message', chatEntry);
    }

    res.status(201).json({ success: true, chat: chatEntry });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get chat history for a patient
// @route GET /api/chat/patient/:patientId/history
export const getChatHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const total = await ChatHistory.countDocuments({ patient: patientId });
    const history = await ChatHistory.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: history.length, total, history: history.reverse() });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete a chat entry
// @route DELETE /api/chat/:id
export const deleteChatEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await ChatHistory.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Chat entry not found' });
    }
    res.status(200).json({ success: true, message: 'Chat entry deleted' });
  } catch (err: any) {
    next(err);
  }
};

// Rule-based reply used only when the ML service is unreachable.
function generateFallbackResponse(query: any) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('medication') || lowerQuery.includes('medicine') || lowerQuery.includes('pill')) {
    return { response: 'I can help you with your medications. Please check your Medications page for your current schedule.', intent: 'medication_query', confidence: 0.5 };
  }
  if (lowerQuery.includes('routine') || lowerQuery.includes('schedule')) {
    return { response: "Your daily routines help maintain a healthy lifestyle. Check your Routines page to see today's schedule.", intent: 'routine_query', confidence: 0.5 };
  }
  if (lowerQuery.includes('help') || lowerQuery.includes('emergency')) {
    return { response: "If this is an emergency, please press the red SOS button or contact your caregiver right away.", intent: 'emergency', confidence: 0.5 };
  }
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
    return { response: "Hello! I'm your MemoryCare assistant. How can I help you today?", intent: 'greeting', confidence: 0.5 };
  }

  return { response: 'I understand your question. You can ask me about your medications, your routines, or anything on your mind.', intent: 'general', confidence: 0.3 };
}
