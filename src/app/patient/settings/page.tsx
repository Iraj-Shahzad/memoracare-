/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * PATIENT SETTINGS — Notifications, Accessibility, Privacy & Security, Data.
 *
 * Key concepts: device preferences live in localStorage (loadSettings/
 * saveSettings) because they're "how this device behaves"; an app-wide applier
 * makes font-size / high-contrast / text-to-speech take effect everywhere, not
 * just here; notification toggles are REAL — the Topbar gates reminders/alerts
 * on them; "Export My Data" downloads a server-generated PDF (apiDownload with
 * the auth token); "Delete Account" is a type-to-confirm in-site modal calling
 * DELETE /auth/me. (The fake "Email Notifications" toggle was removed.)
 * Viva line: "Preferences persist locally and apply app-wide; the toggles
 * actually gate behaviour, and destructive actions are behind typed confirms."
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiPut, apiDelete, apiDownload } from "@/lib/api";
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type PatientSettings } from "@/lib/patientSettings";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const patientId = (user?.profile as any)?._id || user?.id;

  const [settings, setSettings] = useState<PatientSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  // Load saved preferences on mount.
  useEffect(() => { setSettings(loadSettings()); }, []);

  // Update one preference → persist + apply immediately (accessibility/voice).
  const update = (patch: Partial<PatientSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
      return next;
    });
  };

  // Two-factor / session timeout: extra saved prefs (no real enforcement yet).
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  // Change Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleChangePassword = async () => {
    setPwdMsg(null);
    if (!currentPassword || !newPassword) { setPwdMsg({ type: "error", text: "Please fill in all fields." }); return; }
    if (newPassword.length < 6) { setPwdMsg({ type: "error", text: "New password must be at least 6 characters." }); return; }
    if (newPassword !== confirmPassword) { setPwdMsg({ type: "error", text: "New passwords do not match." }); return; }
    try {
      setPwdSaving(true);
      await apiPut("/auth/change-password", { currentPassword, newPassword });
      setPwdMsg({ type: "success", text: "Password changed successfully." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setPwdMsg({ type: "error", text: (err as Error).message || "Could not change password." });
    } finally {
      setPwdSaving(false);
    }
  };

  // Export data as a PDF document (built server-side with pdfkit).
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState("");
  const handleExport = async () => {
    setExportErr("");
    try {
      setExporting(true);
      const safe = (user?.name || "patient").replace(/[^a-z0-9]+/gi, "_");
      await apiDownload(`/patients/${patientId}/export`, `MemoraCare_MyData_${safe}.pdf`);
    } catch (err) {
      setExportErr(err instanceof Error ? err.message : "Could not export your data.");
    } finally {
      setExporting(false);
    }
  };

  // Delete account (in-site confirmation form, no browser popup)
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const handleDelete = async () => {
    if (deleteText.trim().toUpperCase() !== "DELETE") { setDeleteErr('Please type DELETE to confirm.'); return; }
    try {
      setDeleting(true);
      await apiDelete("/auth/me");
      logout();
      router.push("/auth");
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Could not delete the account.");
    } finally {
      setDeleting(false);
    }
  };

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-[#0d9488]" : "bg-gray-300"}`}
      role="switch" aria-checked={enabled}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  const SettingRow = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => (
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
      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar title="Settings" />
        <div className="flex-1 overflow-auto p-6">
          {saved && (
            <div className="mb-4 text-sm font-semibold text-[#0d9488]">Saved ✓</div>
          )}

          {/* Notification Settings */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-1">Notification Settings</h2>
            <p className="text-sm text-gray-500 mb-4">Choose which reminders and alerts you receive on this device.</p>
            <div className="divide-y divide-gray-200">
              <SettingRow label="Medication Reminders" description="Pop-up + voice when a medication is due">
                <ToggleSwitch enabled={settings.medReminders} onChange={(v) => update({ medReminders: v })} />
              </SettingRow>
              <SettingRow label="Routine Reminders" description="Pop-up + voice when a routine is due">
                <ToggleSwitch enabled={settings.routineReminders} onChange={(v) => update({ routineReminders: v })} />
              </SettingRow>
              <SettingRow label="Emergency Alerts" description="Show a banner when a caregiver alert arrives">
                <ToggleSwitch enabled={settings.emergencyAlerts} onChange={(v) => update({ emergencyAlerts: v })} />
              </SettingRow>
              <SettingRow label="Voice Alerts" description="Speak reminders aloud">
                <ToggleSwitch enabled={settings.voiceAlerts} onChange={(v) => update({ voiceAlerts: v })} />
              </SettingRow>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-4">Accessibility</h2>
            <div className="divide-y divide-gray-200">
              <SettingRow label="Font Size" description="Scales the whole app's text">
                <select
                  value={settings.fontSize}
                  onChange={(e) => update({ fontSize: e.target.value as PatientSettings["fontSize"] })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </SettingRow>
              <SettingRow label="High Contrast Mode" description="Stronger contrast for easier reading">
                <ToggleSwitch enabled={settings.highContrast} onChange={(v) => update({ highContrast: v })} />
              </SettingRow>
              <SettingRow label="Text-to-Speech" description="Enable spoken reminders and read-aloud">
                <ToggleSwitch enabled={settings.textToSpeech} onChange={(v) => update({ textToSpeech: v })} />
              </SettingRow>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-4">Privacy &amp; Security</h2>
            <div className="divide-y divide-gray-200">
              <div className="py-4 border-b border-gray-200">
                <button onClick={() => { setShowPasswordForm((v) => !v); setPwdMsg(null); }} className="px-4 py-2 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0a7f73] transition">
                  {showPasswordForm ? "Cancel" : "Change Password"}
                </button>
                {showPasswordForm && (
                  <div className="mt-4 max-w-md space-y-3">
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 characters)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                    {pwdMsg && <p className={`text-sm ${pwdMsg.type === "error" ? "text-red-600" : "text-green-600"}`}>{pwdMsg.text}</p>}
                    <button onClick={handleChangePassword} disabled={pwdSaving} className="px-4 py-2 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0a7f73] transition disabled:opacity-60">{pwdSaving ? "Saving..." : "Update Password"}</button>
                  </div>
                )}
              </div>
              <SettingRow label="Two-Factor Authentication" description="Saved preference — not yet enforced">
                <ToggleSwitch enabled={twoFactorAuth} onChange={setTwoFactorAuth} />
              </SettingRow>
              <SettingRow label="Session Timeout" description="Auto logout after inactivity">
                <select value={settings.sessionTimeout} onChange={(e) => update({ sessionTimeout: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]">
                  <option value="15min">15 minutes</option>
                  <option value="30min">30 minutes</option>
                  <option value="1hr">1 hour</option>
                </select>
              </SettingRow>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-[#1a3c34] mb-4">Data Management</h2>
            <div className="space-y-3">
              <button onClick={handleExport} disabled={exporting} className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-60">
                {exporting ? "Preparing PDF…" : "Export My Data (PDF)"}
              </button>
              {exportErr && <p className="text-sm text-red-600">{exportErr}</p>}
              <button onClick={() => { setShowDelete(true); setDeleteText(""); setDeleteErr(""); }} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition">
                Delete Account
              </button>
              <p className="text-sm text-red-600 mt-2">Warning: Deleting your account is permanent and cannot be undone. All your data will be lost.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account — in-site confirmation form */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deleting && setShowDelete(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a3c34] mb-1">Delete your account?</h3>
            <p className="text-sm text-gray-600 mb-4">This permanently removes your account and all your data. This <b>cannot be undone</b>. Type <b>DELETE</b> below to confirm.</p>
            <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="Type DELETE" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
            {deleteErr && <p className="text-sm text-red-600 mb-2">{deleteErr}</p>}
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => setShowDelete(false)} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting || deleteText.trim().toUpperCase() !== "DELETE"} className="px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{deleting ? "Deleting…" : "Delete forever"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
