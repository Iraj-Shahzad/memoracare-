/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Speech API helpers — text-to-speech (speak) and speech-to-text (listen),
// language-aware for English (en-US) and Urdu (ur-PK). Browser-only.

export type Lang = "en" | "ur";

const LANG_KEY = "memorycare-lang";
const VOICE_REMINDERS_KEY = "memorycare-voice-reminders";

const BCP47: Record<Lang, string> = { en: "en-US", ur: "ur-PK" };

export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem(LANG_KEY) as Lang) || "en";
}
export function setLang(l: Lang) {
  if (typeof window !== "undefined") localStorage.setItem(LANG_KEY, l);
}

export function voiceRemindersOn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(VOICE_REMINDERS_KEY) === "1";
}
export function setVoiceReminders(on: boolean) {
  if (typeof window !== "undefined") localStorage.setItem(VOICE_REMINDERS_KEY, on ? "1" : "0");
}

// Some browsers load voices asynchronously; call once early to warm them up.
export function primeVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const want = lang === "ur" ? "ur" : "en";
  let v = voices.find((vo) => vo.lang?.toLowerCase().startsWith(want));
  // If no Urdu voice is installed, Hindi is phonetically close; else fall back.
  if (!v && lang === "ur") {
    v = voices.find((vo) => vo.lang?.toLowerCase().startsWith("hi"));
  }
  return v || null;
}

// Whether an actual voice for the language is installed (for honest UI hints).
export function hasVoiceFor(lang: Lang): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return !!pickVoice(lang);
}

export function speak(text: string, lang: Lang = getLang()) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  const synth = window.speechSynthesis;
  try {
    synth.cancel(); // stop anything currently speaking
    const u = new SpeechSynthesisUtterance(text);
    u.lang = BCP47[lang];
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = 0.95;
    synth.speak(u);
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function speechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

// One-shot speech recognition → resolves with the transcript.
export function listenOnce(lang: Lang = getLang()): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      reject(new Error("unsupported"));
      return;
    }
    const rec = new SR();
    rec.lang = BCP47[lang];
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let settled = false;

    rec.onresult = (e: any) => {
      settled = true;
      resolve(e.results[0][0].transcript);
    };
    rec.onerror = (e: any) => {
      if (!settled) reject(new Error(e.error || "error"));
    };
    rec.onend = () => {
      if (!settled) reject(new Error("no-speech"));
    };

    try {
      rec.start();
    } catch (err) {
      reject(err as Error);
    }
  });
}
