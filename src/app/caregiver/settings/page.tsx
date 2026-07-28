"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { timeGreeting } from "@/lib/greeting";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut } from "@/lib/api";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    medicationAlerts: true,
    routineAlerts: true,
    emergencySOS: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load previously-saved settings from MongoDB.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet("/caregiver/profile");
        const s = (res.profile?.settings || {}) as Record<string, unknown>;
        if (s.notifications) setNotifications((prev) => ({ ...prev, ...(s.notifications as object) }));
      } catch {
        // keep defaults
      }
    };
    load();
  }, []);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setSaved(false);
      // Persist to MongoDB (User.settings) so choices survive across devices/logins.
      await apiPut("/caregiver/settings", {
        settings: { notifications },
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
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

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="Settings"
          subtitle="Customize your notification preferences"
          greeting={timeGreeting(firstName)}
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

              </div>
              <p className="text-xs text-slate-400 mt-4">These preferences will apply to the reminders your patients receive.</p>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex items-center justify-end gap-4">
              {saved && (
                <span className="text-sm font-semibold text-[#0d9488] flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Settings saved
                </span>
              )}
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
