"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiPut } from "@/lib/api";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    medicationAlerts: true,
    routineAlerts: true,
    emergencySOS: true,
    emailSummaries: false,
  });

  const [alertTiming, setAlertTiming] = useState("immediate");
  const [language, setLanguage] = useState("english");
  const [privacy, setPrivacy] = useState({
    shareWithFamily: true,
    dataCollection: false,
  });
  const [saving, setSaving] = useState(false);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const togglePrivacy = (key: keyof typeof privacy) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      setSaving(true);
      await apiPut(`/patients/${user.id}`, {
        settings: {
          notifications,
          alertTiming,
          language,
          privacy,
        },
      });
      // Settings saved silently
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="Settings"
          subtitle="Customize your notification and privacy preferences"
          greeting={`Good Morning, ${firstName}`}
          avatar={userInitials}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            {/* Notification Preferences */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="font-bold text-[#1a3c34] mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-900">Medication Alerts</p>
                    <p className="text-sm text-slate-600">Get notified when medications are missed or due</p>
                  </div>
                  <button
                    onClick={() => toggleNotification("medicationAlerts")}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      notifications.medicationAlerts ? "bg-[#0d9488]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        notifications.medicationAlerts ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-900">Routine Alerts</p>
                    <p className="text-sm text-slate-600">Get notified about routine schedule changes or missed activities</p>
                  </div>
                  <button
                    onClick={() => toggleNotification("routineAlerts")}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      notifications.routineAlerts ? "bg-[#0d9488]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        notifications.routineAlerts ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-900">Emergency SOS</p>
                    <p className="text-sm text-slate-600">Critical alerts requiring immediate attention</p>
                  </div>
                  <button
                    onClick={() => toggleNotification("emergencySOS")}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      notifications.emergencySOS ? "bg-[#0d9488]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        notifications.emergencySOS ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-900">Email Summaries</p>
                    <p className="text-sm text-slate-600">Receive daily or weekly email summaries</p>
                  </div>
                  <button
                    onClick={() => toggleNotification("emailSummaries")}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      notifications.emailSummaries ? "bg-[#0d9488]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        notifications.emailSummaries ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Alert Timing */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="font-bold text-[#1a3c34] mb-6">Alert Timing</h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-[#0d9488] has-[:checked]:bg-[#f0fdf4]">
                  <input
                    type="radio"
                    name="alertTiming"
                    value="immediate"
                    checked={alertTiming === "immediate"}
                    onChange={(e) => setAlertTiming(e.target.value)}
                    className="w-4 h-4 accent-[#0d9488]"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-slate-900">Immediate</p>
                    <p className="text-sm text-slate-600">Receive alerts right away</p>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-[#0d9488] has-[:checked]:bg-[#f0fdf4]">
                  <input
                    type="radio"
                    name="alertTiming"
                    value="15min"
                    checked={alertTiming === "15min"}
                    onChange={(e) => setAlertTiming(e.target.value)}
                    className="w-4 h-4 accent-[#0d9488]"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-slate-900">15 Minutes Delay</p>
                    <p className="text-sm text-slate-600">Group alerts and send after 15 minutes</p>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-[#0d9488] has-[:checked]:bg-[#f0fdf4]">
                  <input
                    type="radio"
                    name="alertTiming"
                    value="hourly"
                    checked={alertTiming === "hourly"}
                    onChange={(e) => setAlertTiming(e.target.value)}
                    className="w-4 h-4 accent-[#0d9488]"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-slate-900">Hourly Digest</p>
                    <p className="text-sm text-slate-600">Receive hourly summary of all alerts</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Language Settings */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="font-bold text-[#1a3c34] mb-6">Language</h3>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
              >
                <option value="english">English</option>
                <option value="urdu">Urdu</option>
              </select>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-bold text-[#1a3c34] mb-6">Privacy Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-900">Share with Family Members</p>
                    <p className="text-sm text-slate-600">Allow family members to view patient information</p>
                  </div>
                  <button
                    onClick={() => togglePrivacy("shareWithFamily")}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      privacy.shareWithFamily ? "bg-[#0d9488]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        privacy.shareWithFamily ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-900">Data Collection</p>
                    <p className="text-sm text-slate-600">Allow MemoryCare to collect usage analytics</p>
                  </div>
                  <button
                    onClick={() => togglePrivacy("dataCollection")}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      privacy.dataCollection ? "bg-[#0d9488]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        privacy.dataCollection ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-8 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
