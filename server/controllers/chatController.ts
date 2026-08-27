/**
 * CHAT CONTROLLER — the patient-facing assistant chatbot endpoints.
 *
 * Key concepts: intent-classifier design, NOT a generative LLM — classifyIntent POSTs the
 * message to a separate Python/Flask ML service (/predict, 8s AbortSignal timeout) that
 * returns { intent, confidence, response }; buildReply then injects the patient's REAL data
 * (meds, routines, family/emergency contacts, doctor, location) into the reply, in English or
 * Urdu; if the ML service is down we degrade to a rule-based keyword fallback so the app still
 * answers. Prayer times are computed offline with the ESM-only `adhan` library loaded via a
 * NATIVE dynamic import() hidden behind Function() (this server is CommonJS/ts-node, so a plain
 * require would fail), using CalculationMethod.Karachi + Madhab.Hanafi in Asia/Karachi time.
 * Every route is guarded by canAccessPatient (patient / their caregiver / admin only).
 * Viva line: "The chatbot classifies intent with a trained model and fills answers from the
 * patient's own database records — it never free-generates medical facts."
 */
import { Request, Response, NextFunction } from 'express';
import ChatHistory from '../models/ChatHistory';
import Patient from '../models/Patient';
import Medication from '../models/Medication';
import MedicationLog from '../models/MedicationLog';
import Routine from '../models/Routine';
import { canAccessPatient } from '../utils/access';

// URL of the custom Python/Flask intent-classifier service (Phase 4).
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

// Approx coordinates for the cities in the Pakistan city dropdown, so we can
// compute real namaz times offline with the `adhan` library.
const CITY_COORDS: Record<string, [number, number]> = {
  islamabad: [33.6844, 73.0479], karachi: [24.8607, 67.0011], lahore: [31.5204, 74.3587],
  rawalpindi: [33.5651, 73.0169], faisalabad: [31.4504, 73.1350], peshawar: [34.0151, 71.5249],
  quetta: [30.1798, 66.9750], multan: [30.1575, 71.5249], sialkot: [32.4945, 74.5229],
  gujranwala: [32.1877, 74.1945], hyderabad: [25.3960, 68.3578], abbottabad: [34.1688, 73.2215],
};
const DEFAULT_CITY = 'islamabad';

// `adhan` v4 is an ESM-only package, but this server is CommonJS (ts-node), so a
// normal `require('adhan')` fails. We load it once via a NATIVE dynamic import()
// — hidden behind Function() so TypeScript doesn't downlevel it back to require.
const _dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
let _adhanPromise: Promise<any> | null = null;
function getAdhan() {
  if (!_adhanPromise) _adhanPromise = _dynamicImport('adhan');
  return _adhanPromise;
}

// Compute today's prayer times for a patient's city. Uses the University of
// Islamic Sciences, Karachi method + Hanafi Asr (standard for Pakistan), and
// formats in Pakistan time regardless of the server's own timezone.
async function computePrayerTimes(cityRaw: string) {
  const mod = await getAdhan();
  const adhan = mod && mod.Coordinates ? mod : (mod.default || mod); // handle ESM namespace / default
  const key = (cityRaw || '').trim().toLowerCase();
  const matched = !!CITY_COORDS[key];
  const cityKey = matched ? key : DEFAULT_CITY;
  const [lat, lng] = CITY_COORDS[cityKey];
  const params = adhan.CalculationMethod.Karachi();
  params.madhab = adhan.Madhab.Hanafi;
  const times = new adhan.PrayerTimes(new adhan.Coordinates(lat, lng), new Date(), params);
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });
  return {
    cityUsed: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
    matched,
    fajr: fmt(times.fajr), dhuhr: fmt(times.dhuhr), asr: fmt(times.asr),
    maghrib: fmt(times.maghrib), isha: fmt(times.isha),
  };
}

// Ask the trained model to classify the message. Returns
// { intent, confidence, response } or null if the service is unreachable.
// What the Python/Flask /predict endpoint returns. fetch().json() is typed as
// `unknown`, so without this the fields below cannot be read.
interface MlPrediction {
  intent?: string;
  confidence?: number | null;
  response?: string;
}

async function classifyIntent(message: any): Promise<MlPrediction | null> {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
      // Don't hang the request if the ML service is slow/down.
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as MlPrediction;
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
  meal_time: 'کھانے کے صحیح اوقات پر کھانا اچھا ہے۔ براہ کرم آج کے کھانے کے بارے میں اپنے نگہداشت کنندہ سے پوچھیں۔',
  weather: 'میں موجودہ موسم نہیں دیکھ سکتا، لیکن براہ کرم دن کے مطابق آرام دہ کپڑے پہنیں۔ آپ کا نگہداشت کنندہ مزید بتا سکتا ہے۔',
  memories: 'آئیے آپ کی یادوں کی گیلری کھولیں تاکہ آپ اپنی تصویریں دیکھ سکیں۔',
  hydration: 'پانی پینا صحت کے لیے ضروری ہے۔ براہ کرم ایک گلاس پانی پی لیں۔',
  exercise: 'تھوڑی سی چہل قدمی آپ کے لیے اچھی ہے۔ براہ کرم اپنے نگہداشت کنندہ کے ساتھ سیر کریں۔',
  sleep_rest: 'آرام ضروری ہے۔ اگر آپ تھکے ہوئے ہیں تو کچھ دیر لیٹ جائیں۔',
  entertainment: 'آئیے کچھ اچھا سنیں۔ آپ کا نگہداشت کنندہ آپ کی پسندیدہ موسیقی یا کہانی لگا سکتا ہے۔',
  prayer: 'شاید نماز کا وقت ہو گیا ہے۔ آپ کا نگہداشت کنندہ آج کے نماز کے اوقات بتا سکتا ہے۔',
  news: 'میں تازہ خبریں نہیں دکھا سکتا، لیکن آپ کا نگہداشت کنندہ آج کی خبریں سنا سکتا ہے۔',
  bathroom: 'ٹھیک ہے۔ آپ کا نگہداشت کنندہ آپ کو باتھ روم تک محفوظ طریقے سے لے جا سکتا ہے۔',
  positive_mood: 'یہ سن کر بہت خوشی ہوئی! مجھے خوشی ہے کہ آپ آج اچھا محسوس کر رہے ہیں۔',
  fallback: 'معذرت، میں سمجھ نہیں سکا۔ آپ مجھ سے اپنی دوائیں، معمولات، خاندان، یا تاریخ و وقت کے بارے میں پوچھ سکتے ہیں۔',
};

// English response templates for the conversational (non-data) intents. Used as
// the base reply when Wit.ai (which returns only an intent, no text) is the
// classifier — buildReply refines these / injects real data.
const STATIC_EN: Record<string, string> = {
  greeting: "Assalam o Alaikum! I'm your MemoryCare assistant. How can I help you today?",
  goodbye: "Allah Hafiz! Take care of yourself. I'm here whenever you need me.",
  thanks: "You're welcome! Let me know if you need anything else.",
  feeling: "I'm sorry you feel this way. You are safe and people who love you are nearby. Shall I notify your caregiver?",
  emergency: "This looks like an emergency. Please press the red SOS button right away so your caregiver is alerted.",
  help: "I'm your MemoryCare assistant. I can help with your medications, routines, family, and the date and time. Just ask!",
  appointment: "For your appointment details, please check with your caregiver.",
  meal_time: "Eating at regular times is good for you. Please ask your caregiver about today's meals.",
  weather: "I can't see the current weather, but please dress comfortably for the day. Your caregiver can tell you more.",
  memories: "Let's open your Memory Gallery so you can look at your photos.",
  hydration: "Staying hydrated is important. Please have a glass of water.",
  exercise: "A little walk is good for you. Please take a walk with your caregiver.",
  sleep_rest: "Rest is important. If you feel tired, please lie down for a while.",
  entertainment: "Let's listen to something nice. Your caregiver can play your favourite music or a story.",
  prayer: "It may be time for prayer. Your caregiver can tell you today's prayer times.",
  news: "I can't show the latest news, but your caregiver can read you today's headlines.",
  bathroom: "Okay. Your caregiver can help you get to the bathroom safely.",
  positive_mood: "That's wonderful to hear! I'm so glad you're feeling good today.",
  fallback: "Sorry, I didn't quite understand. You can ask me about your medications, routines, family, or the date and time.",
};

// ---- Wit.ai (cloud NLU) — PRIMARY intent classifier when configured ----
// Reads a Server Access Token from WIT_TOKEN. If unset or the call fails, the
// caller falls back to the self-hosted Python model, then to rule-based replies.
const WIT_TOKEN = process.env.WIT_TOKEN;
const WIT_MIN_CONFIDENCE = Number(process.env.WIT_MIN_CONFIDENCE || 0.55);

async function classifyWithWit(message: any) {
  if (!WIT_TOKEN) return null; // Wit.ai not configured -> skip
  try {
    const url = `https://api.wit.ai/message?v=20240101&q=${encodeURIComponent(String(message))}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${WIT_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const top = Array.isArray(data.intents) ? data.intents[0] : null;
    if (!top || Number(top.confidence) < WIT_MIN_CONFIDENCE) return null;
    return { intent: top.name, confidence: Number(top.confidence) };
  } catch (err: any) {
    console.error('[chat] Wit.ai unreachable:', err.message);
    return null;
  }
}

// Turn a classified intent into a personalized reply in the requested language
// using the patient's real data. `base` is the generic (English) response the
// model returned; used for English static intents.
async function buildReply(intent: any, base: any, patientId: any, lang: 'en' | 'ur' = 'en') {
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const ur = lang === 'ur';

  switch (intent) {
    case 'medication':
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

    case 'doctor_query': {
      const patient: any = await Patient.findById(patientId).select('doctor');
      const doc = patient?.doctor;
      if (!doc) return ur ? STATIC_UR.fallback : base;
      return ur ? `آپ کے ڈاکٹر ${doc} ہیں۔` : `Your doctor is ${doc}.`;
    }

    case 'prayer': {
      const patient: any = await Patient.findById(patientId).select('city');
      try {
        const p = await computePrayerTimes(patient?.city || '');
        if (ur) {
          const note = p.matched ? '' : '\n(شہر درج نہیں تھا، اسلام آباد کے اوقات دکھائے گئے ہیں)';
          return `${p.cityUsed} کے آج کے نماز اوقات:\n• فجر ${p.fajr}\n• ظہر ${p.dhuhr}\n• عصر ${p.asr}\n• مغرب ${p.maghrib}\n• عشاء ${p.isha}${note}`;
        }
        const note = p.matched ? '' : '\n(No city on file, showing Islamabad times.)';
        return `Today's prayer times for ${p.cityUsed}:\n• Fajr ${p.fajr}\n• Dhuhr ${p.dhuhr}\n• Asr ${p.asr}\n• Maghrib ${p.maghrib}\n• Isha ${p.isha}${note}`;
      } catch {
        // If calculation fails for any reason, fall back to gentle guidance.
        return ur ? STATIC_UR.prayer : base;
      }
    }

    case 'caregiver_query': {
      // The patient's assigned caregiver(s) live on Patient.assignedCaregivers (User refs).
      const patient: any = await Patient.findById(patientId)
        .populate({ path: 'assignedCaregivers', select: 'name phone' });
      const cg = patient?.assignedCaregivers?.[0];
      if (!cg) {
        return ur
          ? 'ابھی آپ کا کوئی نگہداشت کنندہ مقرر نہیں۔ آپ کے اہلِ خانہ یہ مقرر کر سکتے ہیں۔'
          : "You don't have a caregiver assigned yet. Your family can set one up for you.";
      }
      return ur
        ? `آپ کے نگہداشت کنندہ ${cg.name} ہیں${cg.phone ? `، فون: ${cg.phone}` : ''}۔`
        : `Your caregiver is ${cg.name}${cg.phone ? `. Phone: ${cg.phone}` : ''}.`;
    }

    case 'appointment': {
      // The app schedules daily routines, not separate appointments — so answer
      // honestly about today's schedule instead of a vague deferral.
      return ur
        ? 'آپ کے آج کے شیڈول میں کوئی اپائنٹمنٹ نہیں ہے۔ اگر کوئی طے ہوگی تو آپ کا نگہداشت کنندہ آپ کو بتا دے گا۔'
        : "There is no appointment in your schedule for today. If one is set, your caregiver will let you know.";
    }

    case 'medication_status': {
      // How many of today's active medicines have been logged as taken.
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const [meds, taken] = await Promise.all([
        Medication.countDocuments({ patient: patientId, isActive: true }),
        MedicationLog.countDocuments({ patient: patientId, status: 'taken', scheduledTime: { $gte: dayStart, $lt: dayEnd } }),
      ]);
      if (!meds) {
        return ur ? 'آپ کی کوئی دوا درج نہیں ہے۔' : "You don't have any medicines on file.";
      }
      return ur
        ? `آج آپ نے ${meds} میں سے ${taken} دوائیں لی ہیں۔${taken < meds ? ' براہ کرم باقی لے لیں۔' : ' بہت خوب!'}`
        : `Today you have taken ${taken} of ${meds} medicines.${taken < meds ? ' Please take the rest.' : ' Well done!'}`;
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
    // Constrain to the ChatHistory enum so an unexpected value fails here with a
    // clear message rather than deeper down as a Mongoose validation error.
    const mode = req.body.mode === 'voice' ? 'voice' : 'text';
    const lang: 'en' | 'ur' = req.body.lang === 'ur' ? 'ur' : 'en';

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a message' });
    }
    // Cap the message. It is forwarded to Wit.ai and to the Flask model, so an
    // unbounded payload would be sent to two external services and then stored.
    if (query.length > 1000) {
      return res.status(400).json({ success: false, message: 'Message must be 1000 characters or fewer' });
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
    let source = 'rules'; // which classifier produced the intent (for transparency)

    // Classifier cascade:
    //  1) Wit.ai cloud NLU (primary, when WIT_TOKEN is set)
    //  2) self-hosted Python model (fallback — works offline)
    //  3) rule-based keywords (last resort — always works)
    const wit = await classifyWithWit(query);
    if (wit) {
      intent = wit.intent;
      confidence = wit.confidence;
      const base = STATIC_EN[intent] || STATIC_EN.fallback;
      responseText = await buildReply(intent, base, patientId, lang);
      source = 'wit.ai';
    } else {
      const prediction = await classifyIntent(query);
      if (prediction && prediction.intent) {
        intent = prediction.intent;
        confidence = prediction.confidence ?? null;
        responseText = await buildReply(intent, prediction.response, patientId, lang);
        source = 'python';
      } else {
        // Both classifiers offline → rule-based fallback so the app still works.
        const fallback = generateFallbackResponse(query, lang);
        responseText = fallback.response;
        intent = fallback.intent;
        confidence = fallback.confidence;
        source = 'rules';
      }
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

    res.status(201).json({ success: true, chat: chatEntry, source });
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
      .skip((Number(page) - 1) * Number(limit))
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
    const entry: any = await ChatHistory.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Chat entry not found' });
    }
    // Only the owning patient (or their caregiver / admin) may delete it.
    if (!(await canAccessPatient(req.user, entry.patient?.toString()))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this chat entry' });
    }
    await entry.deleteOne();
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
