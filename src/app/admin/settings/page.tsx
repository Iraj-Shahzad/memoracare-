"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiPut } from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  void user;

  const [settings, setSettings] = useState({
    systemName: "MemoryCare",
    adminEmail: "admin@memorycare.pk",
    maintenanceMode: false,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    forcePasswordChange: false,
    twoFactorAuth: true,
    emailServiceHost: "smtp.gmail.com",
    emailServicePort: 587,
    smsGateway: false,
    pushNotifications: true,
    autoBackup: true,
    backupFrequency: "Daily",
    lastBackup: "Apr 14, 2024 at 2:00 AM",
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Settings are managed locally with defaults; mark as loaded
    setLoading(false);
  }, []);

  const handleChange = (key: string, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      await apiPut("/admin/settings", settings);
      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: unknown) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <AdminSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="System Settings"
          subtitle="Configure system-wide settings"
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
            <>
            {saveMessage && (
              <div className={`mb-4 p-4 rounded-lg text-sm ${saveMessage.includes("success") ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {saveMessage}
              </div>
            )}

            {/* General Settings */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                General Settings
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    System Name
                  </label>
                  <input
                    type="text"
                    value={settings.systemName}
                    onChange={(e) =>
                      handleChange("systemName", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) =>
                      handleChange("adminEmail", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Maintenance Mode
                  </label>
                  <button
                    onClick={() =>
                      handleChange(
                        "maintenanceMode",
                        !settings.maintenanceMode
                      )
                    }
                    className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                      settings.maintenanceMode
                        ? "bg-red-500"
                        : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.maintenanceMode ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                Security Settings
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) =>
                      handleChange("maxLoginAttempts", parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <select
                    value={settings.sessionTimeout}
                    onChange={(e) =>
                      handleChange("sessionTimeout", parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Force Password Change
                  </label>
                  <button
                    onClick={() =>
                      handleChange(
                        "forcePasswordChange",
                        !settings.forcePasswordChange
                      )
                    }
                    className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                      settings.forcePasswordChange
                        ? "bg-green-500"
                        : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.forcePasswordChange ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Two-Factor Authentication
                  </label>
                  <button
                    onClick={() =>
                      handleChange("twoFactorAuth", !settings.twoFactorAuth)
                    }
                    className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                      settings.twoFactorAuth ? "bg-green-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.twoFactorAuth ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                Notification Settings
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Service Host
                  </label>
                  <input
                    type="text"
                    value={settings.emailServiceHost}
                    onChange={(e) =>
                      handleChange("emailServiceHost", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Service Port
                  </label>
                  <input
                    type="number"
                    value={settings.emailServicePort}
                    onChange={(e) =>
                      handleChange("emailServicePort", parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    SMS Gateway
                  </label>
                  <button
                    onClick={() =>
                      handleChange("smsGateway", !settings.smsGateway)
                    }
                    className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                      settings.smsGateway ? "bg-green-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.smsGateway ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Push Notifications
                  </label>
                  <button
                    onClick={() =>
                      handleChange("pushNotifications", !settings.pushNotifications)
                    }
                    className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                      settings.pushNotifications ? "bg-green-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.pushNotifications ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Backup & Data */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                Backup &amp; Data
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Auto Backup
                  </label>
                  <button
                    onClick={() =>
                      handleChange("autoBackup", !settings.autoBackup)
                    }
                    className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                      settings.autoBackup ? "bg-green-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.autoBackup ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Backup Frequency
                  </label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) =>
                      handleChange("backupFrequency", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Last Backup
                  </label>
                  <p className="text-sm text-slate-600">
                    {settings.lastBackup}
                  </p>
                </div>
                <button className="w-full px-4 py-2 border border-[#0d9488] text-[#0d9488] rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium">
                  Backup Now
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-6 py-3 bg-[#0d9488] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            </>
            )}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
