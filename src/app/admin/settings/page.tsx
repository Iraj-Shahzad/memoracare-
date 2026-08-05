"use client";

/**
 * ADMIN SETTINGS — trimmed to REAL, working items only.
 * The previous version had many unenforced toggles (2FA, login limits, email/SMS
 * gateways, auto-backup schedule) and a fake "last backup" timestamp — none were
 * wired to anything, so they've been removed. What remains is genuinely real:
 *  - System Information (live: app, your admin email, DB status, record counts)
 *  - Backup Now: downloads a real JSON export of the database (GET /admin/backup)
 */

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/components/ui/UIProvider";
import { apiGet, apiDownload } from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useUI();

  const [health, setHealth] = useState<{ database?: string } | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [h, s] = await Promise.all([
          apiGet("/admin/system-health").catch(() => ({})),
          apiGet("/admin/stats").catch(() => ({})),
        ]);
        setHealth(h.health || null);
        setStats(s.stats || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await apiDownload("/admin/backup", `memoracare-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast("Backup downloaded.", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Could not create the backup.", "error");
    } finally {
      setBackingUp(false);
    }
  };

  const dbOk = health?.database === "connected";
  const Row = ({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold ${accent || "text-slate-900"}`}>{value}</span>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex min-h-screen bg-[#f0fdf4]">
        <AdminSidebar />

        <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
          <Topbar title="System Settings" subtitle="System information and data backup" showSOS={false} />

          <main className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-4xl mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* System Information (live, read-only) */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">System Information</h3>
                    <Row label="Application" value="MemoraCare" />
                    <Row label="Signed in as" value={user?.email || "—"} />
                    <Row label="Your role" value={<span className="capitalize">{user?.role || "admin"}</span>} />
                    <Row label="Database" value={dbOk ? "Connected" : "Disconnected"} accent={dbOk ? "text-green-600" : "text-red-600"} />
                    <Row label="Total users" value={stats?.totalUsers ?? "—"} />
                    <Row label="Patients" value={stats?.patients ?? "—"} />
                    <Row label="Caregivers" value={stats?.caregivers ?? "—"} />
                    <Row label="Open alerts" value={stats?.activeAlerts ?? "—"} />
                  </div>

                  {/* Backup & Data (real) */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Backup &amp; Data</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Download a full JSON export of the database — users (without passwords), patients,
                      caregivers, medications, routines, memories, alerts and reports. Keep it somewhere safe.
                    </p>
                    <button
                      onClick={handleBackup}
                      disabled={backingUp}
                      className="w-full px-4 py-2.5 bg-[#0d9488] text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {backingUp ? "Preparing backup…" : "Backup Now (download)"}
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="w-5 h-5 flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p className="text-sm text-slate-600">
                      Advanced options (scheduled auto-backup, email/SMS gateways, 2FA enforcement) are not
                      enabled in this build, so they've been removed rather than shown as non-working toggles.
                    </p>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
