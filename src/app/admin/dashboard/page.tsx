"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/shared/Topbar";
import AdminSidebar from "@/components/shared/AdminSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface DashboardStats {
  totalUsers?: number;
  activePatients?: number;
  activeCaregivers?: number;
  faceScans?: number;
  userGrowth?: string;
  patientGrowth?: string;
  caregiverGrowth?: string;
}

interface HealthService {
  name?: string;
  status?: string;
  detail?: string;
}

interface ActivityItem {
  _id?: string;
  message?: string;
  user?: string;
  action?: string;
  timestamp?: string;
  createdAt?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState("overview");
  void activePanel;

  const [stats, setStats] = useState<DashboardStats>({});
  const [health, setHealth] = useState<HealthService[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, healthRes, activityRes] = await Promise.all([
          apiGet("/admin/stats").catch(() => ({})),
          apiGet("/admin/system-health").catch(() => ({})),
          apiGet("/admin/activity-log").catch(() => ({})),
        ]);
        setStats(statsRes.data || statsRes || {});
        setHealth(statsRes.services || healthRes.services || healthRes.data || []);
        setActivities(activityRes.data || activityRes.activities || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
    <div className="flex min-h-screen bg-[#f5f6f5]">
      <AdminSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
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
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
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
                  <span className="text-xs font-semibold text-[#16a34a] flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    </svg>
                    {stats.userGrowth || "+12%"}
                  </span>
                </div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{stats.totalUsers ?? 156}</div>
                <div className="text-[13px] text-[#64748b] mt-0.5">Total Users</div>
              </div>

              {/* Active Patients */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-[42px] h-[42px] rounded-[10px] bg-[#dcfce7] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[#16a34a] flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    </svg>
                    {stats.patientGrowth || "+8%"}
                  </span>
                </div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{stats.activePatients ?? 89}</div>
                <div className="text-[13px] text-[#64748b] mt-0.5">Active Patients</div>
              </div>

              {/* Active Caregivers */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-[42px] h-[42px] rounded-[10px] bg-[#ccfbf1] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[#16a34a] flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    </svg>
                    {stats.caregiverGrowth || "+3"}
                  </span>
                </div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{stats.activeCaregivers ?? 42}</div>
                <div className="text-[13px] text-[#64748b] mt-0.5">Active Caregivers</div>
              </div>

              {/* Face Scans */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-[42px] h-[42px] rounded-[10px] bg-[#fef3c7] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <rect x="2" y="2" width="20" height="20" rx="2" />
                      <circle cx="12" cy="10" r="3" />
                      <path d="M7 21v-1a5 5 0 0110 0v1" />
                    </svg>
                  </div>
                </div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{stats.faceScans != null ? stats.faceScans.toLocaleString() : "2,847"}</div>
                <div className="text-[13px] text-[#64748b] mt-0.5">Face Scans (This Month)</div>
              </div>
            </div>

            {/* Two Columns: Recent Users + System Health */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Recent Users */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden reveal">
                <div className="p-5 px-6 border-b border-[#e2e8f0] flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1a3c34]">Recent Users</h3>
                  <button
                    onClick={() => setActivePanel("users")}
                    className="py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e2e8f0] bg-white text-[#64748b] cursor-pointer hover:border-[#0d9488] hover:text-[#0d9488] transition-colors"
                  >
                    View All
                  </button>
                </div>
                <table className="w-full border-collapse">
                  <thead className="bg-[#f8fafc]">
                    <tr>
                      <th className="py-3 px-5 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">User</th>
                      <th className="py-3 px-5 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Role</th>
                      <th className="py-3 px-5 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Ahmed Khan */}
                    <tr className="hover:bg-[#f0fdf4]">
                      <td className="py-3.5 px-5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0" style={{ background: "linear-gradient(135deg,#0d9488,#1a3c34)" }}>AK</div>
                          <div>
                            <div className="font-semibold">Ahmed Khan</div>
                            <div className="text-xs text-[#94a3b8]">Patient</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm border-b border-[#f1f5f9]">
                        <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1e40af]">Patient</span>
                      </td>
                      <td className="py-3.5 px-5 text-sm border-b border-[#f1f5f9]">
                        <span className="flex items-center gap-1.5 text-[13px]">
                          <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Sarah Ahmed */}
                    <tr className="hover:bg-[#f0fdf4]">
                      <td className="py-3.5 px-5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0" style={{ background: "linear-gradient(135deg,#3b82f6,#1e40af)" }}>SA</div>
                          <div>
                            <div className="font-semibold">Sarah Ahmed</div>
                            <div className="text-xs text-[#94a3b8]">Caregiver</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm border-b border-[#f1f5f9]">
                        <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#166534]">Caregiver</span>
                      </td>
                      <td className="py-3.5 px-5 text-sm border-b border-[#f1f5f9]">
                        <span className="flex items-center gap-1.5 text-[13px]">
                          <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Fatima Bibi */}
                    <tr className="hover:bg-[#f0fdf4]">
                      <td className="py-3.5 px-5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0" style={{ background: "linear-gradient(135deg,#8b5cf6,#5b21b6)" }}>FB</div>
                          <div>
                            <div className="font-semibold">Fatima Bibi</div>
                            <div className="text-xs text-[#94a3b8]">Patient</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm border-b border-[#f1f5f9]">
                        <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1e40af]">Patient</span>
                      </td>
                      <td className="py-3.5 px-5 text-sm border-b border-[#f1f5f9]">
                        <span className="flex items-center gap-1.5 text-[13px]">
                          <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Rashid Ali */}
                    <tr className="hover:bg-[#f0fdf4]">
                      <td className="py-3.5 px-5 text-sm text-[#1a3c34]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0" style={{ background: "linear-gradient(135deg,#ec4899,#9d174d)" }}>RA</div>
                          <div>
                            <div className="font-semibold">Rashid Ali</div>
                            <div className="text-xs text-[#94a3b8]">Patient</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm">
                        <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1e40af]">Patient</span>
                      </td>
                      <td className="py-3.5 px-5 text-sm">
                        <span className="flex items-center gap-1.5 text-[13px]">
                          <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
                          Inactive
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* System Health */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden reveal">
                <div className="p-5 px-6 border-b border-[#e2e8f0] flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1a3c34]">System Health</h3>
                  <button className="py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e2e8f0] bg-white text-[#64748b] cursor-pointer hover:border-[#0d9488] hover:text-[#0d9488] transition-colors">
                    Details
                  </button>
                </div>
                <div className="p-5 px-6">
                  {/* API Server */}
                  <div className="flex items-center justify-between py-3.5 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#dcfce7] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                          <rect x="2" y="2" width="20" height="8" rx="2" />
                          <rect x="2" y="14" width="20" height="8" rx="2" />
                          <line x1="6" y1="6" x2="6.01" y2="6" />
                          <line x1="6" y1="18" x2="6.01" y2="18" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">API Server</div>
                        <div className="text-xs text-[#64748b]">Response time: {health?.[0]?.detail || "45ms"}</div>
                      </div>
                    </div>
                    <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#16a34a]">{health?.[0]?.status || "Healthy"}</span>
                  </div>

                  {/* MongoDB Database */}
                  <div className="flex items-center justify-between py-3.5 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#dcfce7] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                          <ellipse cx="12" cy="5" rx="9" ry="3" />
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">MongoDB Database</div>
                        <div className="text-xs text-[#64748b]">Connections: {health?.[1]?.detail || "23/100"}</div>
                      </div>
                    </div>
                    <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#16a34a]">{health?.[1]?.status || "Healthy"}</span>
                  </div>

                  {/* Face Recognition (Flask) */}
                  <div className="flex items-center justify-between py-3.5 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#fef3c7] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                          <rect x="2" y="2" width="20" height="20" rx="2" />
                          <circle cx="12" cy="10" r="3" />
                          <path d="M7 21v-1a5 5 0 0110 0v1" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Face Recognition (Flask)</div>
                        <div className="text-xs text-[#64748b]">GPU Usage: {health?.[2]?.detail || "72%"}</div>
                      </div>
                    </div>
                    <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#d97706]">{health?.[2]?.status || "Warning"}</span>
                  </div>

                  {/* OpenAI API (Chatbot) */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#dcfce7] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">OpenAI API (Chatbot)</div>
                        <div className="text-xs text-[#64748b]">Avg response: {health?.[3]?.detail || "1.2s"}</div>
                      </div>
                    </div>
                    <span className="py-1 px-3 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#16a34a]">{health?.[3]?.status || "Healthy"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Columns: Recent Activity + Patient Compliance */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden reveal">
                <div className="p-5 px-6 border-b border-[#e2e8f0] flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1a3c34]">Recent Activity</h3>
                  <button className="py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e2e8f0] bg-white text-[#64748b] cursor-pointer hover:border-[#0d9488] hover:text-[#0d9488] transition-colors">
                    View All
                  </button>
                </div>
                <div className="p-5 px-6">
                  {activities.length > 0 ? activities.slice(0, 4).map((activity, idx) => (
                    <div key={activity._id || idx} className={`flex gap-3 py-3 ${idx < Math.min(activities.length, 4) - 1 ? "border-b border-[#f1f5f9]" : ""}`}>
                      <div className="w-8 h-8 rounded-lg bg-[#dcfce7] flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[13px] text-[#1a3c34] leading-relaxed">{activity.message || activity.action || "Activity"}</div>
                        <div className="text-[11px] text-[#94a3b8] mt-0.5">{activity.timestamp || activity.createdAt || ""}</div>
                      </div>
                    </div>
                  )) : (
                  <>
                  {/* Activity 1 */}
                  <div className="flex gap-3 py-3 border-b border-[#f1f5f9]">
                    <div className="w-8 h-8 rounded-lg bg-[#dcfce7] flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[13px] text-[#1a3c34] leading-relaxed"><strong>Ahmed Khan</strong> completed morning medication routine</div>
                      <div className="text-[11px] text-[#94a3b8] mt-0.5">5 minutes ago</div>
                    </div>
                  </div>

                  {/* Activity 2 */}
                  <div className="flex gap-3 py-3 border-b border-[#f1f5f9]">
                    <div className="w-8 h-8 rounded-lg bg-[#dbeafe] flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <rect x="2" y="2" width="20" height="20" rx="2" />
                        <circle cx="12" cy="10" r="3" />
                        <path d="M7 21v-1a5 5 0 0110 0v1" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[13px] text-[#1a3c34] leading-relaxed"><strong>Sarah Ahmed</strong> recognized via face scan (97%)</div>
                      <div className="text-[11px] text-[#94a3b8] mt-0.5">12 minutes ago</div>
                    </div>
                  </div>

                  {/* Activity 3 */}
                  <div className="flex gap-3 py-3 border-b border-[#f1f5f9]">
                    <div className="w-8 h-8 rounded-lg bg-[#fee2e2] flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[13px] text-[#1a3c34] leading-relaxed"><strong>Fatima Bibi</strong> missed afternoon medication</div>
                      <div className="text-[11px] text-[#94a3b8] mt-0.5">1 hour ago</div>
                    </div>
                  </div>

                  {/* Activity 4 */}
                  <div className="flex gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ede9fe] flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[13px] text-[#1a3c34] leading-relaxed">New caregiver <strong>Nadia Khan</strong> registered</div>
                      <div className="text-[11px] text-[#94a3b8] mt-0.5">2 hours ago</div>
                    </div>
                  </div>
                  </>
                  )}
                </div>
              </div>

              {/* Patient Compliance */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden reveal">
                <div className="p-5 px-6 border-b border-[#e2e8f0] flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1a3c34]">Patient Compliance</h3>
                  <button className="py-2 px-4 rounded-lg text-[13px] font-semibold border border-[#e2e8f0] bg-white text-[#64748b] cursor-pointer hover:border-[#0d9488] hover:text-[#0d9488] transition-colors">
                    Full Report
                  </button>
                </div>
                <div className="p-5 px-6">
                  {/* Ahmed Khan */}
                  <div className="flex items-center justify-between py-3.5 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg,#0d9488,#1a3c34)" }}>AK</div>
                      <div>
                        <div className="text-sm font-semibold">Ahmed Khan</div>
                        <div className="text-xs text-[#64748b]">Alzheimer&apos;s</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 w-[140px]">
                      <div className="flex-1 h-2 bg-[#e2e8f0] rounded overflow-hidden">
                        <div className="h-full rounded bg-[#16a34a]" style={{ width: "92%" }} />
                      </div>
                      <span className="text-[13px] font-semibold text-[#16a34a] min-w-[36px]">92%</span>
                    </div>
                  </div>

                  {/* Fatima Bibi */}
                  <div className="flex items-center justify-between py-3.5 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg,#8b5cf6,#5b21b6)" }}>FB</div>
                      <div>
                        <div className="text-sm font-semibold">Fatima Bibi</div>
                        <div className="text-xs text-[#64748b]">Dementia</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 w-[140px]">
                      <div className="flex-1 h-2 bg-[#e2e8f0] rounded overflow-hidden">
                        <div className="h-full rounded bg-[#f59e0b]" style={{ width: "67%" }} />
                      </div>
                      <span className="text-[13px] font-semibold text-[#d97706] min-w-[36px]">67%</span>
                    </div>
                  </div>

                  {/* Rashid Ali */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg,#ec4899,#9d174d)" }}>RA</div>
                      <div>
                        <div className="text-sm font-semibold">Rashid Ali</div>
                        <div className="text-xs text-[#64748b]">MCI</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 w-[140px]">
                      <div className="flex-1 h-2 bg-[#e2e8f0] rounded overflow-hidden">
                        <div className="h-full rounded bg-[#16a34a]" style={{ width: "85%" }} />
                      </div>
                      <span className="text-[13px] font-semibold text-[#16a34a] min-w-[36px]">85%</span>
                    </div>
                  </div>
                </div>
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
