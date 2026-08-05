"use client";

/**
 * ADMIN MONITORING — live system health, trimmed to REAL data only.
 *
 * Key concepts: ProtectedRoute allowedRoles={["admin"]}. A single Promise.all (each with
 * .catch fallback) pulls three REAL endpoints: GET /admin/system-health for server status,
 * DB connection, process uptime and memory (backend uses process.uptime()/process.memoryUsage()),
 * GET /admin/stats for record counts (users/medications/routines/active alerts), and
 * GET /admin/activity-log for the recent system-events feed (real alerts, reports, user
 * registrations, capped at 15). fmtUptime()/mb() format raw seconds and bytes for display.
 * NOTE: previous hardcoded fake metrics (99.9% uptime, "34% CPU", invented API times/events)
 * were deliberately removed — everything shown is now genuinely live.
 * Viva line: "Every metric here is real server telemetry from the health endpoint — I removed the fake CPU and uptime figures the template shipped with".
 */

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface SystemEvent {
  id: number;
  description: string;
  time: string;
  type: string;
  severity?: string;
}

export default function MonitoringPage() {
  const { user } = useAuth();
  void user;

  const [health, setHealth] = useState<{ server?: string; database?: string; uptime?: number; memory?: { heapUsed?: number; rss?: number } } | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [healthRes, statsRes, activityRes] = await Promise.all([
          apiGet("/admin/system-health").catch(() => ({})),
          apiGet("/admin/stats").catch(() => ({})),
          apiGet("/admin/activity-log").catch(() => ({})),
        ]);
        setHealth(healthRes.health || null);
        setStats(statsRes.stats || null);
        const acts = activityRes.activities || [];
        setEvents(
          (Array.isArray(acts) ? acts : []).slice(0, 15).map((e: Record<string, unknown>, idx: number) => ({
            id: idx + 1,
            description: (e.description || "") as string,
            time: e.date ? new Date(e.date as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—",
            type: (e.type || "info") as string,
            severity: (e.severity as string) || undefined,
          }))
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load monitoring data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Format process.uptime() seconds into "2h 15m" / "45m" / "30s".
  const fmtUptime = (s?: number) => {
    if (!s || s < 0) return "—";
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m`;
    return `${Math.floor(s)}s`;
  };
  const mb = (bytes?: number) => (bytes ? `${Math.round(bytes / 1024 / 1024)} MB` : "—");

  const dbOk = health?.database === "connected";

  const eventBadge = (type: string, severity?: string) => {
    if (severity === "critical") return "bg-red-100 text-red-700";
    if (type === "alert" || severity === "warning") return "bg-yellow-100 text-yellow-700";
    if (type === "user_registered") return "bg-green-100 text-green-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex min-h-screen bg-[#f0fdf4]">
        <AdminSidebar />

        <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
          <Topbar title="System Monitoring" subtitle="Live server health and activity" showSOS={false} />

          <main className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-7xl mx-auto">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
              )}

              {!loading && !error && (
                <>
                  {/* Live server health (real) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg border border-slate-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-slate-600 text-sm font-medium">Server</p>
                        <div className={`w-3 h-3 rounded-full ${health?.server === "running" ? "bg-green-500" : "bg-slate-400"}`} />
                      </div>
                      <p className="text-2xl font-bold text-green-600 capitalize">{health?.server || "—"}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-slate-600 text-sm font-medium">Database</p>
                        <div className={`w-3 h-3 rounded-full ${dbOk ? "bg-green-500" : "bg-red-500"}`} />
                      </div>
                      <p className={`text-2xl font-bold capitalize ${dbOk ? "text-green-600" : "text-red-600"}`}>{health?.database || "—"}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-6">
                      <p className="text-slate-600 text-sm font-medium mb-4">Uptime</p>
                      <p className="text-2xl font-bold text-[#0d9488]">{fmtUptime(health?.uptime)}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-6">
                      <p className="text-slate-600 text-sm font-medium mb-4">Memory (heap)</p>
                      <p className="text-2xl font-bold text-[#0d9488]">{mb(health?.memory?.heapUsed)}</p>
                      <p className="text-xs text-slate-500 mt-1">RSS {mb(health?.memory?.rss)}</p>
                    </div>
                  </div>

                  {/* Real record counts */}
                  {stats && (
                    <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Platform Data</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Total Users", value: stats.totalUsers },
                          { label: "Medications", value: stats.totalMedications },
                          { label: "Routines", value: stats.totalRoutines },
                          { label: "Unresolved Alerts", value: stats.activeAlerts },
                        ].map((s) => (
                          <div key={s.label} className="text-center p-4 rounded-lg bg-slate-50">
                            <div className="text-2xl font-bold text-[#1a3c34]">{s.value ?? "—"}</div>
                            <div className="text-sm text-slate-600 mt-1">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent system events (real activity feed) */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                      <h3 className="text-lg font-semibold text-slate-900">Recent System Events</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Event</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {events.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">No recent activity.</td></tr>
                          ) : events.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">{e.description}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{e.time}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${eventBadge(e.type, e.severity)}`}>
                                  {e.type.replace("_", " ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
