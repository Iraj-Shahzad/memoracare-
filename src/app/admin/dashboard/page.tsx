"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/shared/Topbar";
import AdminSidebar from "@/components/shared/AdminSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

// Matches the real payload from GET /api/admin/stats (adminController.getSystemStats).
interface DashboardStats {
  totalUsers?: number;
  patients?: number;
  caregivers?: number;
  activeAlerts?: number;
  totalMedications?: number;
  totalRoutines?: number;
  totalReports?: number;
  newUsersThisMonth?: number;
}

// Matches GET /api/admin/system-health (adminController.getSystemHealth).
interface SystemHealth {
  server?: string;
  database?: string;
  uptime?: number;
  memory?: { rss?: number; heapTotal?: number; heapUsed?: number };
  timestamp?: string;
}

// Matches GET /api/admin/activity-log (adminController.getActivityLog).
interface ActivityItem {
  type?: string;
  description?: string;
  severity?: string;
  user?: string;
  date?: string;
}

// Matches GET /api/users (userController.getAllUsers).
interface UserRow {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
}

// Turn an absolute timestamp into a short "5 minutes ago" style label.
function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

// Seconds of process uptime → "2h 14m" style.
function formatUptime(seconds?: number): string {
  if (seconds == null) return "—";
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const ROLE_STYLES: Record<string, string> = {
  patient: "bg-[#dbeafe] text-[#1e40af]",
  caregiver: "bg-[#dcfce7] text-[#166534]",
  admin: "bg-[#ede9fe] text-[#7c3aed]",
};

// Deterministic gradient for a user's avatar (stable per person, not random).
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#0d9488,#1a3c34)",
  "linear-gradient(135deg,#3b82f6,#1e40af)",
  "linear-gradient(135deg,#8b5cf6,#5b21b6)",
  "linear-gradient(135deg,#ec4899,#9d174d)",
  "linear-gradient(135deg,#f59e0b,#b45309)",
];
function gradientFor(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}
function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({});
  const [health, setHealth] = useState<SystemHealth>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, healthRes, activityRes, usersRes] = await Promise.all([
          apiGet("/admin/stats").catch(() => ({})),
          apiGet("/admin/system-health").catch(() => ({})),
          apiGet("/admin/activity-log").catch(() => ({})),
          apiGet("/users?limit=5").catch(() => ({})),
        ]);
        setStats(statsRes.stats || statsRes.data || {});
        setHealth(healthRes.health || healthRes.data || {});
        setActivities(activityRes.activities || activityRes.data || []);
        setRecentUsers(usersRes.users || usersRes.data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dbHealthy = health.database === "connected";
  const serverHealthy = health.server === "running";
  const memPct =
    health.memory?.heapTotal && health.memory?.heapUsed
      ? Math.round((health.memory.heapUsed / health.memory.heapTotal) * 100)
      : null;

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
    <div className="flex min-h-screen bg-[#f5f6f5]">
      <AdminSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="Admin Dashboard"
          subtitle="System overview and management"
          avatar={user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() : "AD"}
          showSOS={false}
        >
          <span className="py-1.5 px-3.5 bg-[#ede9fe] text-[#7c3aed] rounded-lg text-xs font-bold">Admin</span>
        </Topbar>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 px-8">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}
            {!loading && (
            <>
            {/* Stats Grid — all values come straight from GET /api/admin/stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Users */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-[42px] h-[42px] rounded-[10px] bg-[#dbeafe] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  {stats.newUsersThisMonth != null && stats.newUsersThisMonth > 0 && (
                    <span className="text-xs font-semibold text-[#16a34a] flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      </svg>
                      +{stats.newUsersThisMonth} this month
                    </span>
                  )}
                </div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{stats.totalUsers ?? 0}</div>
                <div className="text-[13px] text-[#64748b] mt-0.5">Total Users</div>
              </div>

              {/* Patients */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-[42px] h-[42px] rounded-[10px] bg-[#dcfce7] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{stats.patients ?? 0}</div>
                <div className="text-[13px] text-[#64748b] mt-0.5">Patients</div>
              </div>

              {/* Caregivers */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-[42px] h-[42px] rounded-[10px] bg-[#ccfbf1] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                </div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{stats.caregivers ?? 0}</div>
                <div className="text-[13px] text-[#64748b] mt-0.5">Caregivers</div>
              </div>

              {/* Active Alerts */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-[42px] h-[42px] rounded-[10px] bg-[#fee2e2] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                </div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{stats.activeAlerts ?? 0}</div>
                <div className="text-[13px] text-[#64748b] mt-0.5">Active Alerts</div>
              </div>
            </div>

            {/* Two Columns: Recent Users + System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Recent Users — real, from GET /api/users?limit=5 */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden reveal">
                <div className="p-5 px-6 border-b border-[#e2e8f0] flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1a3c34]">Recent Users</h3>
                  <button
                    onClick={() => router.push("/admin/users")}
                    className="py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e2e8f0] bg-white text-[#64748b] cursor-pointer hover:border-[#0d9488] hover:text-[#0d9488] transition-colors"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-[#f8fafc]">
                    <tr>
                      <th className="py-3 px-5 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">User</th>
                      <th className="py-3 px-5 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Role</th>
                      <th className="py-3 px-5 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 px-5 text-center text-sm text-[#94a3b8]">No users yet.</td>
                      </tr>
                    ) : recentUsers.map((u, idx) => {
                      const isLast = idx === recentUsers.length - 1;
                      const border = isLast ? "" : "border-b border-[#f1f5f9]";
                      const active = u.isActive !== false;
                      return (
                        <tr key={u._id || idx} className="hover:bg-[#f0fdf4]">
                          <td className={`py-3.5 px-5 text-sm text-[#1a3c34] ${border}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0" style={{ background: gradientFor(u._id || u.name || String(idx)) }}>
                                {initials(u.name)}
                              </div>
                              <div>
                                <div className="font-semibold">{u.name || "Unnamed"}</div>
                                <div className="text-xs text-[#94a3b8]">{u.email || ""}</div>
                              </div>
                            </div>
                          </td>
                          <td className={`py-3.5 px-5 text-sm ${border}`}>
                            <span className={`py-1 px-3 rounded-full text-xs font-semibold capitalize ${ROLE_STYLES[u.role || ""] || "bg-[#f1f5f9] text-[#64748b]"}`}>
                              {u.role || "—"}
                            </span>
                          </td>
                          <td className={`py-3.5 px-5 text-sm ${border}`}>
                            <span className="flex items-center gap-1.5 text-[13px]">
                              <span className={`w-2 h-2 rounded-full ${active ? "bg-[#16a34a]" : "bg-[#94a3b8]"}`} />
                              {active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              {/* System Health — real, from GET /api/admin/system-health */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden reveal">
                <div className="p-5 px-6 border-b border-[#e2e8f0] flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1a3c34]">System Health</h3>
                  <button onClick={() => router.push("/admin/monitoring")} className="py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e2e8f0] bg-white text-[#64748b] cursor-pointer hover:border-[#0d9488] hover:text-[#0d9488] transition-colors">
                    Details
                  </button>
                </div>
                <div className="p-5 px-6">
                  {/* API Server */}
                  <div className="flex items-center justify-between py-3.5 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${serverHealthy ? "bg-[#dcfce7]" : "bg-[#fee2e2]"}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={serverHealthy ? "#16a34a" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                          <rect x="2" y="2" width="20" height="8" rx="2" />
                          <rect x="2" y="14" width="20" height="8" rx="2" />
                          <line x1="6" y1="6" x2="6.01" y2="6" />
                          <line x1="6" y1="18" x2="6.01" y2="18" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">API Server</div>
                        <div className="text-xs text-[#64748b]">Uptime: {formatUptime(health.uptime)}</div>
                      </div>
                    </div>
                    <span className={`py-1 px-3 rounded-full text-xs font-semibold ${serverHealthy ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#fee2e2] text-[#ef4444]"}`}>{serverHealthy ? "Healthy" : "Down"}</span>
                  </div>

                  {/* MongoDB Database */}
                  <div className="flex items-center justify-between py-3.5 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dbHealthy ? "bg-[#dcfce7]" : "bg-[#fee2e2]"}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={dbHealthy ? "#16a34a" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                          <ellipse cx="12" cy="5" rx="9" ry="3" />
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">MongoDB Database</div>
                        <div className="text-xs text-[#64748b] capitalize">{health.database || "unknown"}</div>
                      </div>
                    </div>
                    <span className={`py-1 px-3 rounded-full text-xs font-semibold ${dbHealthy ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#fee2e2] text-[#ef4444]"}`}>{dbHealthy ? "Healthy" : "Disconnected"}</span>
                  </div>

                  {/* Memory usage */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#dbeafe] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <rect x="9" y="9" width="6" height="6" />
                          <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                          <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Server Memory</div>
                        <div className="text-xs text-[#64748b]">{memPct != null ? `${memPct}% of heap used` : "—"}</div>
                      </div>
                    </div>
                    <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#16a34a]">
                      {health.memory?.heapUsed != null ? `${Math.round(health.memory.heapUsed / 1048576)} MB` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity — real, from GET /api/admin/activity-log (full width) */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden reveal mb-6">
              <div className="p-5 px-6 border-b border-[#e2e8f0] flex items-center justify-between">
                <h3 className="text-base font-bold text-[#1a3c34]">Recent Activity</h3>
                <button onClick={() => router.push("/admin/monitoring")} className="py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e2e8f0] bg-white text-[#64748b] cursor-pointer hover:border-[#0d9488] hover:text-[#0d9488] transition-colors">
                  View All
                </button>
              </div>
              <div className="p-5 px-6">
                {activities.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#94a3b8]">No recent activity.</div>
                ) : activities.slice(0, 8).map((activity, idx) => {
                  const isLast = idx === Math.min(activities.length, 8) - 1;
                  const isAlert = activity.type === "alert";
                  const isUser = activity.type === "user_registered";
                  const bg = isAlert ? "bg-[#fee2e2]" : isUser ? "bg-[#ede9fe]" : "bg-[#dbeafe]";
                  const stroke = isAlert ? "#ef4444" : isUser ? "#8b5cf6" : "#3b82f6";
                  return (
                    <div key={idx} className={`flex gap-3 py-3 ${isLast ? "" : "border-b border-[#f1f5f9]"}`}>
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          {isAlert ? (
                            <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
                          ) : isUser ? (
                            <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></>
                          ) : (
                            <polyline points="20 6 9 17 4 12" />
                          )}
                        </svg>
                      </div>
                      <div>
                        <div className="text-[13px] text-[#1a3c34] leading-relaxed">{activity.description || "Activity"}</div>
                        <div className="text-[11px] text-[#94a3b8] mt-0.5">{timeAgo(activity.date)}</div>
                      </div>
                    </div>
                  );
                })}
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
