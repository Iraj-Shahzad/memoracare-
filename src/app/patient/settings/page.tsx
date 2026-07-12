/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;

  // Notification Settings
  const [medReminders, setMedReminders] = useState(true);
  const [routineReminders, setRoutineReminders] = useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [voiceAlerts, setVoiceAlerts] = useState(true);

  // Accessibility Settings
  const [fontSize, setFontSize] = useState("medium");
  const [highContrast, setHighContrast] = useState(false);
  const [textToSpeech, setTextToSpeech] = useState(true);

  // Privacy & Security Settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30min");

  // Language & Region Settings
  const [language, setLanguage] = useState("english");
  const [timezone, setTimezone] = useState("asia-karachi");

  // Toggle Switch Component
  const ToggleSwitch = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-[#0d9488]" : "bg-gray-300"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  const SettingRow = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex-1">
        <p className="font-medium text-[#1a3c34]">{label}</p>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
    <div className="flex h-screen bg-[#f0fdf4]">
      <PatientSidebar />
      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar title="Settings" />
        <div className="flex-1 overflow-auto p-6">
          {/* Notification Settings Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-4">
              Notification Settings
            </h2>
            <div className="divide-y divide-gray-200">
              <SettingRow label="Medication Reminders">
                <ToggleSwitch
                  enabled={medReminders}
                  onChange={setMedReminders}
                />
              </SettingRow>
              <SettingRow label="Routine Reminders">
                <ToggleSwitch
                  enabled={routineReminders}
                  onChange={setRoutineReminders}
                />
              </SettingRow>
              <SettingRow label="Emergency Alerts">
                <ToggleSwitch
                  enabled={emergencyAlerts}
                  onChange={setEmergencyAlerts}
                />
              </SettingRow>
              <SettingRow label="Email Notifications">
                <ToggleSwitch
                  enabled={emailNotifications}
                  onChange={setEmailNotifications}
                />
              </SettingRow>
              <SettingRow label="Voice Alerts">
                <ToggleSwitch enabled={voiceAlerts} onChange={setVoiceAlerts} />
              </SettingRow>
            </div>
          </div>

          {/* Accessibility Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-4">Accessibility</h2>
            <div className="divide-y divide-gray-200">
              <SettingRow
                label="Font Size"
                description="Choose your preferred text size"
              >
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </SettingRow>
              <SettingRow label="High Contrast Mode">
                <ToggleSwitch
                  enabled={highContrast}
                  onChange={setHighContrast}
                />
              </SettingRow>
              <SettingRow label="Text-to-Speech">
                <ToggleSwitch
                  enabled={textToSpeech}
                  onChange={setTextToSpeech}
                />
              </SettingRow>
            </div>
          </div>

          {/* Privacy & Security Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-4">
              Privacy &amp; Security
            </h2>
            <div className="divide-y divide-gray-200">
              <div className="py-4 border-b border-gray-200">
                <button className="px-4 py-2 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0a7f73] transition">
                  Change Password
                </button>
              </div>
              <SettingRow label="Two-Factor Authentication">
                <ToggleSwitch
                  enabled={twoFactorAuth}
                  onChange={setTwoFactorAuth}
                />
              </SettingRow>
              <SettingRow
                label="Session Timeout"
                description="Auto logout after inactivity"
              >
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                >
                  <option value="15min">15 minutes</option>
                  <option value="30min">30 minutes</option>
                  <option value="1hr">1 hour</option>
                </select>
              </SettingRow>
            </div>
          </div>

          {/* Language & Region Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-4">
              Language &amp; Region
            </h2>
            <div className="divide-y divide-gray-200">
              <SettingRow label="Language">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                >
                  <option value="english">English</option>
                  <option value="urdu">Urdu</option>
                </select>
              </SettingRow>
              <SettingRow label="Timezone">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                >
                  <option value="asia-karachi">Asia/Karachi</option>
                  <option value="asia-lahore">Asia/Lahore</option>
                  <option value="asia-islamabad">Asia/Islamabad</option>
                </select>
              </SettingRow>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-4">
              Data Management
            </h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
                Export My Data
              </button>
              <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition">
                Delete Account
              </button>
              <p className="text-sm text-red-600 mt-2">
                Warning: Deleting your account is permanent and cannot be undone.
                All your data will be lost.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
