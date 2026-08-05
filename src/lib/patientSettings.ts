/**
 * PATIENT SETTINGS — per-device patient UI/accessibility preferences.
 *
 * Key concepts: a PatientSettings shape with DEFAULT_SETTINGS; persisted in localStorage
 * under the "patientSettings" key (device-local, not synced to the server); loadSettings
 * merges saved values over the defaults so new fields never break old saves; applySettings
 * pushes preferences to the live document — font size scales the root em (15/16/19px),
 * a .high-contrast class is toggled, and text-to-speech + voice alerts drive the shared
 * voice-reminder flag via setVoiceReminders. All calls are SSR-guarded.
 * Viva line: "Accessibility preferences live on the patient's own device and are applied straight to the document root."
 */
import { setVoiceReminders } from "@/lib/speech";

// Patient device/UI preferences. Stored locally (they apply on THIS device) and
// read by the Topbar (to gate reminders) and the app root (to apply accessibility).
export interface PatientSettings {
  medReminders: boolean;
  routineReminders: boolean;
  emergencyAlerts: boolean;
  emailNotifications: boolean;
  voiceAlerts: boolean;
  fontSize: "small" | "medium" | "large";
  highContrast: boolean;
  textToSpeech: boolean;
  sessionTimeout: string;
}

export const DEFAULT_SETTINGS: PatientSettings = {
  medReminders: true,
  routineReminders: true,
  emergencyAlerts: true,
  emailNotifications: false,
  voiceAlerts: true,
  fontSize: "medium",
  highContrast: false,
  textToSpeech: true,
  sessionTimeout: "30min",
};

const KEY = "patientSettings";

export function loadSettings(): PatientSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    // Spread defaults first, then saved values — so any newly-added setting keeps its default.
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: PatientSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  applySettings(s);
}

// Apply the visual/voice preferences to the live document.
export function applySettings(s: PatientSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Font size scales the root em, so the whole UI grows/shrinks.
  root.style.fontSize = s.fontSize === "small" ? "15px" : s.fontSize === "large" ? "19px" : "16px";
  // High-contrast toggle (styled in globals.css via .high-contrast).
  root.classList.toggle("high-contrast", !!s.highContrast);
  // Text-to-speech / voice alerts drive the shared voice-reminder flag.
  setVoiceReminders(!!(s.textToSpeech && s.voiceAlerts));
}
