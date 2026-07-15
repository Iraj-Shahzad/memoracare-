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

// Urdu response templates for the conversational (non-data) intents.
const STATIC_UR: Record<string, string> = {
  greeting: 'السلام علیکم! میں آپ کا میموری کیئر اسسٹنٹ ہوں۔ میں آپ کی کیسے مدد کر سکتا ہوں؟',
  goodbye: 'اللہ حافظ! اپنا خیال رکھیں۔ جب بھی ضرورت ہو میں یہاں موجود ہوں۔',
  thanks: 'خوشی ہوئی کہ میں مدد کر سکا۔ کسی اور چیز کی ضرورت ہو تو بتائیں۔',
  feeling: 'مجھے افسوس ہے کہ آپ ایسا محسوس کر رہے ہیں۔ آپ محفوظ ہیں اور آپ سے محبت کرنے والے قریب ہیں۔ کیا میں آپ کے نگہداشت کنندہ کو اطلاع دوں؟',
  emergency: 'یہ ہنگامی صورت لگتی ہے۔ براہ کرم فوراً سرخ SOS بٹن دبائیں تاکہ آپ کے نگہداشت کنندہ کو اطلاع ہو جائے۔',
  help: 'میں آپ کا میموری کیئر اسسٹنٹ ہوں۔ میں آپ کی دواؤں، معمولات، خاندان، اور تاریخ و وقت کے بارے میں مدد کر سکتا ہوں۔ بس پوچھیں!',
  appointment: 'اپنی ملاقاتوں کی تفصیل کے لیے براہ کرم اپنے نگہداشت کنندہ سے رابطہ کریں۔',
  fallback: 'معذرت، میں سمجھ نہیں سکا۔ آپ مجھ سے اپنی دوائیں، معمولات، خاندان، یا تاریخ و وقت کے بارے میں پوچھ سکتے ہیں۔',
};

// Turn a classified intent into a personalized reply in the requested language
// using the patient's real data. `base` is the generic (English) response the
// model returned; used for English static intents.
async function buildReply(intent: any, base: any, patientId: any, lang: 'en' | 'ur' = 'en') {
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const ur = lang === 'ur';

  switch (intent) {
    case 'medication_query':
    case 'medication_time': {
      const meds = await Medication.find({ patient: patientId, isActive: true }).select('name dosage times');
      if (!meds.length) {
        return ur
          ? 'اس وقت آپ کی کوئی دوا درج نہیں ہے۔ براہ کرم اپنے نگہداشت کنندہ سے رابطہ کریں۔'
          : "You don't have any medications on file right now. Please check with your caregiver.";
      }
      const lines = meds.map((m) => {
        const times = m.times && m.times.length ? `${ur ? ' — ' : ' at '}${m.times.join(', ')}` : '';
        const dose = m.dosage ? ` (${m.dosage})` : '';
        return `• ${m.name}${dose}${times}`;
      });
      if (ur) {
        const lead = intent === 'medication_time' ? 'آپ کی دواؤں کے اوقات یہ ہیں:' : 'آپ کی دوائیں یہ ہیں:';
        return `${lead}\n${lines.join('\n')}\n\nہر خوراک لینے کے بعد اپنے میڈیکیشن صفحے پر نشان لگانا نہ بھولیں۔`;
      }
      const lead = intent === 'medication_time' ? 'Here are the times for your medicines:' : 'Here are your medicines:';
      return `${lead}\n${lines.join('\n')}\n\nRemember to mark each one as taken on your Medications page.`;
    }

    case 'routine_query': {
      const routines = await Routine.find({ patient: patientId, isActive: true }).select('activityName startTime days');
      const today = routines.filter((r) => !r.days || r.days.length === 0 || r.days.includes(todayName));
      if (!today.length) {
        return ur ? 'آج آپ کا کوئی معمول شیڈول نہیں ہے۔ اپنا دن اچھا گزاریں!' : "You don't have any routines scheduled for today. Enjoy your day!";
      }
      const lines = today
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
        .map((r) => `• ${r.activityName}${r.startTime ? `${ur ? ' — ' : ' at '}${r.startTime}` : ''}`);
      return ur ? `آج کے لیے آپ کے معمولات:\n${lines.join('\n')}` : `Here is your routine for today:\n${lines.join('\n')}`;
    }

    case 'name_query': {
      const patient: any = await Patient.findById(patientId).populate('user', 'name');
      const name = patient?.user?.name;
      if (!name) return ur ? STATIC_UR.fallback : base;
      return ur ? `آپ کا نام ${name} ہے۔ آپ سے مل کر خوشی ہوئی!` : `Your name is ${name}. It's good to see you!`;
    }

    case 'date_time': {
      const locale = ur ? 'ur-PK' : 'en-US';
      let dateStr: string;
      let timeStr: string;
      try {
        dateStr = now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        timeStr = now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
      } catch {
        dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }
      return ur ? `آج ${dateStr} ہے، اور وقت ${timeStr} ہے۔` : `Today is ${dateStr}, and the time is ${timeStr}.`;
    }

    case 'family_query': {
      const patient: any = await Patient.findById(patientId).select('emergencyContacts');
      const contacts = patient?.emergencyContacts || [];
      if (!contacts.length) {
        return ur
          ? 'مجھے ابھی آپ کے خاندان کی تفصیلات معلوم نہیں۔ آپ کا نگہداشت کنندہ انہیں شامل کر سکتا ہے۔'
          : "I don't have your family details on file yet. Your caregiver can add them for you.";
      }
      const lines = contacts.map((c: any) => `• ${c.name}${c.relationship ? ` (${c.relationship})` : ''}${c.phone ? ` — ${c.phone}` : ''}`);
      return ur ? `آپ کے قریبی لوگ یہ ہیں:\n${lines.join('\n')}` : `Here are the people close to you:\n${lines.join('\n')}`;
    }

    case 'location': {
      const patient: any = await Patient.findById(patientId).select('address city');
      if (patient?.address || patient?.city) {
        const place = [patient.address, patient.city].filter(Boolean).join(', ');
        return ur ? `آپ ${place} میں رہتے ہیں۔ آپ محفوظ ہیں۔` : `You live at ${place}. You are safe.`;
      }
      return ur ? STATIC_UR.fallback : base;
    }

    default:
      // greeting, thanks, goodbye, feeling, emergency, help, appointment, fallback
      if (ur) return STATIC_UR[intent] || STATIC_UR.fallback;
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
    const lang: 'en' | 'ur' = req.body.lang === 'ur' ? 'ur' : 'en';

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
      responseText = await buildReply(intent, prediction.response, patientId, lang);
    } else {
      // ML service offline → rule-based fallback so the app still works.
      const fallback = generateFallbackResponse(query, lang);
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
function generateFallbackResponse(query: any, lang: 'en' | 'ur' = 'en') {
  const q = (query || '').toLowerCase();
  const ur = lang === 'ur';

  // Match English keywords, Roman-Urdu, and common Urdu words.
  if (q.includes('medication') || q.includes('medicine') || q.includes('pill') || q.includes('dawa') || query.includes('دوا')) {
    return {
      response: ur ? 'میں آپ کی دواؤں میں مدد کر سکتا ہوں۔ براہ کرم اپنا میڈیکیشن صفحہ دیکھیں۔' : 'I can help you with your medications. Please check your Medications page for your current schedule.',
      intent: 'medication_query', confidence: 0.5,
    };
  }
  if (q.includes('routine') || q.includes('schedule') || query.includes('معمول')) {
    return {
      response: ur ? 'اپنے آج کے معمولات دیکھنے کے لیے براہ کرم روٹینز صفحہ کھولیں۔' : "Your daily routines help maintain a healthy lifestyle. Check your Routines page to see today's schedule.",
      intent: 'routine_query', confidence: 0.5,
    };
  }
  if (q.includes('help') || q.includes('emergency') || query.includes('مدد')) {
    return {
      response: ur ? 'اگر یہ ہنگامی صورت ہے تو براہ کرم فوراً سرخ SOS بٹن دبائیں یا اپنے نگہداشت کنندہ سے رابطہ کریں۔' : 'If this is an emergency, please press the red SOS button or contact your caregiver right away.',
      intent: 'emergency', confidence: 0.5,
    };
  }
  if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('salam') || query.includes('سلام')) {
    return {
      response: ur ? 'السلام علیکم! میں آپ کا میموری کیئر اسسٹنٹ ہوں۔ میں آپ کی کیسے مدد کر سکتا ہوں؟' : "Hello! I'm your MemoryCare assistant. How can I help you today?",
      intent: 'greeting', confidence: 0.5,
    };
  }

  return {
    response: ur ? 'میں آپ کا سوال سمجھنے کی کوشش کر رہا ہوں۔ آپ مجھ سے اپنی دوائیں، معمولات، یا کسی بھی بات کے بارے میں پوچھ سکتے ہیں۔' : 'I understand your question. You can ask me about your medications, your routines, or anything on your mind.',
    intent: 'general', confidence: 0.3,
  };
}
