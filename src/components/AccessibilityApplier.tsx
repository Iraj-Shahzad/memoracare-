"use client";

import { useEffect } from "react";
import { loadSettings, applySettings } from "@/lib/patientSettings";

/**
 * Applies the patient's saved accessibility preferences (font size, high
 * contrast, voice) to the document on every page load, so they take effect
 * app-wide — not just on the Settings page.
 */
export default function AccessibilityApplier() {
  useEffect(() => {
    applySettings(loadSettings());
  }, []);
  return null;
}
