"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface DashboardData {
  totalPatients: number;
  medsCompliance: number;
  missedAlerts: number;
  routinesToday: { completed: number; total: number };
  patients: Array<{
    _id: string;
    name: string;
    diagnosis: string;
    age: number;
    compliance: number;
    initials: string;
    color: string;
  }>;
  alerts: Array<{
    _id: string;
    type: string;
    severity: string;
    patientName: string;
    message: string;
    description: string;
    timeAgo: string;
  }>;
  complianceTable: Array<{
    patientName: string;
    initials: string;
    color: string;
    medication: string;
    schedule: string;
    today: string;
    weekly: number;
    status: string;
  }>;
  notes: Array<{
    _id: string;
    patientName: string;
    initials: string;
    color: string;
    content: string;
    date: string;
  }>;
}

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await apiGet("/caregiver/dashboard");
        setDashboardData(res.data || res);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const initials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  const now = new Date();
  const hour = now.getHours();
  const greetingTime = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f5f6f5]">
      <CaregiverSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="Caregiver Dashboard"
          greeting={`${greetingTime}, ${firstName}`}
          subtitle={`${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | You're monitoring ${dashboardData?.totalPatients ?? 0} patients`}
          avatar={initials}
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748b]">Loading dashboard...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            <>
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-7">
              {/* Total Patients */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="w-10 h-10 rounded-xl bg-[#dbeafe] flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" className="w-5 h-5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="text-[#64748b] text-xs font-semibold uppercase tracking-wide mb-2">Total Patients</div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{dashboardData?.totalPatients ?? 0}</div>
                <div className="text-[#94a3b8] text-xs mt-1">All active</div>
              </div>

              {/* Meds Compliance */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="w-10 h-10 rounded-xl bg-[#d1fae5] flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" className="w-5 h-5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="text-[#64748b] text-xs font-semibold uppercase tracking-wide mb-2">Meds Compliance</div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{dashboardData?.medsCompliance ?? 0}<span className="text-base text-[#94a3b8]">%</span></div>
                <div className="text-[#94a3b8] text-xs mt-1">This week</div>
              </div>

              {/* Missed Alerts */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="w-10 h-10 rounded-xl bg-[#fee2e2] flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="w-5 h-5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="text-[#64748b] text-xs font-semibold uppercase tracking-wide mb-2">Missed Alerts</div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{dashboardData?.missedAlerts ?? 0}</div>
                <div className="text-[#94a3b8] text-xs mt-1">Needs attention</div>
              </div>

              {/* Routines Today */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="w-10 h-10 rounded-xl bg-[#fef3c7] flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="w-5 h-5">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="text-[#64748b] text-xs font-semibold uppercase tracking-wide mb-2">Routines Today</div>
                <div className="text-[28px] font-extrabold text-[#1a3c34]">{dashboardData?.routinesToday?.completed ?? 0}<span className="text-base text-[#94a3b8]"> / {dashboardData?.routinesToday?.total ?? 0}</span></div>
                <div className="text-[#94a3b8] text-xs mt-1">Across all patients</div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              {/* My Patients Panel */}
              <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] reveal">
                <div className="flex justify-between items-center mb-5">
                  <div className="text-base font-bold text-[#1a3c34]">My Patients</div>
                  <span className="text-[#0d9488] text-[13px] font-semibold cursor-pointer">View all</span>
                </div>

                {(dashboardData?.patients || []).map((patient, idx) => (
                <div key={patient._id || idx} className={`flex items-center gap-3.5 p-3.5 bg-[#f9fafb] rounded-xl ${idx < (dashboardData?.patients?.length || 0) - 1 ? 'mb-2.5' : ''} cursor-pointer hover:bg-[#f0fdfa] transition-colors`}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ backgroundColor: patient.color || '#0d9488' }}>{patient.initials || patient.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#1a3c34]">{patient.name}</div>
                    <div className="text-xs text-[#64748b] mt-0.5">{patient.diagnosis} &middot; Age {patient.age}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-extrabold ${patient.compliance >= 80 ? 'text-[#059669]' : patient.compliance >= 60 ? 'text-[#d97706]' : 'text-[#dc2626]'}`}>{patient.compliance}%</div>
                    <div className="text-[11px] text-[#94a3b8]">compliance</div>
                  </div>
                </div>
                ))}
              </div>

              {/* Recent Alerts Panel */}
              <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] reveal">
                <div className="flex justify-between items-center mb-5">
                  <div className="text-base font-bold text-[#1a3c34]">Recent Alerts</div>
                  <span className="text-[#0d9488] text-[13px] font-semibold cursor-pointer">View all</span>
                </div>

                {(dashboardData?.alerts || []).map((alert, idx) => {
                  const isError = alert.severity === 'critical' || alert.severity === 'error';
                  const isWarning = alert.severity === 'warning';
                  const bgColor = isError ? 'bg-[#fef2f2]' : isWarning ? 'bg-[#fffbeb]' : 'bg-[#f0fdfa]';
                  const borderColor = isError ? 'border-[#ef4444]' : isWarning ? 'border-[#f59e0b]' : 'border-[#0d9488]';
                  const iconBg = isError ? 'bg-[#fee2e2]' : isWarning ? 'bg-[#fef3c7]' : 'bg-[#d1fae5]';
                  const iconStroke = isError ? '#ef4444' : isWarning ? '#f59e0b' : '#059669';

                  return (
                  <div key={alert._id || idx} className={`flex items-start gap-3 p-3.5 rounded-xl ${idx < (dashboardData?.alerts?.length || 0) - 1 ? 'mb-2.5' : ''} ${bgColor} border-l-4 ${borderColor}`}>
                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      {isError || isWarning ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" className="w-4 h-4">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" className="w-4 h-4">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-[#1a3c34]">{alert.message || `${alert.patientName}`}</div>
                      <div className="text-xs text-[#64748b] mt-0.5">{alert.description || ''}</div>
                    </div>
                    <div className="text-[11px] text-[#94a3b8] whitespace-nowrap mt-0.5">{alert.timeAgo || ''}</div>
                  </div>
                  );
                })}
              </div>

              {/* Medication Compliance Overview - Full Width */}
              <div className="col-span-2 bg-white rounded-2xl p-6 border border-[#e2e8f0] reveal">
                <div className="flex justify-between items-center mb-5">
                  <div className="text-base font-bold text-[#1a3c34]">Medication Compliance Overview</div>
                  <span className="text-[#0d9488] text-[13px] font-semibold cursor-pointer">Export report</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-2.5 px-3.5 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-b border-[#e2e8f0]">Patient</th>
                      <th className="text-left py-2.5 px-3.5 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-b border-[#e2e8f0]">Medication</th>
                      <th className="text-left py-2.5 px-3.5 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-b border-[#e2e8f0]">Schedule</th>
                      <th className="text-left py-2.5 px-3.5 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-b border-[#e2e8f0]">Today</th>
                      <th className="text-left py-2.5 px-3.5 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-b border-[#e2e8f0]">Weekly</th>
                      <th className="text-left py-2.5 px-3.5 text-xs font-semibold text-[#64748b] uppercase tracking-wide border-b border-[#e2e8f0]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.complianceTable || []).map((row, idx) => {
                      const weeklyColor = row.weekly >= 80 ? '#22c55e' : row.weekly >= 60 ? '#f59e0b' : '#ef4444';
                      const weeklyTextColor = row.weekly >= 80 ? '#059669' : row.weekly >= 60 ? '#d97706' : '#dc2626';
                      const statusBg = row.status === 'On Track' ? 'bg-[#d1fae5] text-[#065f46]' : row.status === 'Needs Attention' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#fef3c7] text-[#92400e]';

                      return (
                      <tr key={idx} className="hover:bg-[#f9fafb]">
                        <td className="py-3 px-3.5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: row.color || '#0d9488' }}>{row.initials}</div>
                            {row.patientName}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">{row.medication}</td>
                        <td className="py-3 px-3.5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">{row.schedule}</td>
                        <td className="py-3 px-3.5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">
                          <span className={`inline-flex py-1 px-2.5 rounded-full text-[11px] font-semibold ${row.today === 'Missed' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#d1fae5] text-[#065f46]'}`}>{row.today}</span>
                        </td>
                        <td className="py-3 px-3.5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">
                          <div className="flex items-center gap-2">
                            <div className="w-[100px] h-1.5 bg-[#e2e8f0] rounded-sm overflow-hidden">
                              <div className="h-full rounded-sm" style={{ width: `${row.weekly}%`, backgroundColor: weeklyColor }} />
                            </div>
                            <span className="text-[13px] font-semibold" style={{ color: weeklyTextColor }}>{row.weekly}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-sm text-[#1a3c34] border-b border-[#f1f5f9]">
                          <span className={`inline-flex py-1 px-2.5 rounded-full text-[11px] font-semibold ${statusBg}`}>{row.status}</span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Caregiver Notes - Full Width */}
              <div className="col-span-2 bg-white rounded-2xl p-6 border border-[#e2e8f0] reveal">
                <div className="flex justify-between items-center mb-5">
                  <div className="text-base font-bold text-[#1a3c34]">Caregiver Notes</div>
                  <span className="text-[#0d9488] text-[13px] font-semibold cursor-pointer">All notes</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(dashboardData?.notes || []).map((note, idx) => (
                  <div
                    key={note._id || idx}
                    className="p-3.5 bg-[#f9fafb] rounded-xl cursor-pointer"
                    onClick={() => setActiveNote(activeNote === idx ? null : idx)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-[13px] font-bold text-[#1a3c34] flex items-center">
                        <span className="inline-flex w-[22px] h-[22px] rounded-full text-white text-[9px] font-bold items-center justify-center mr-1.5" style={{ backgroundColor: note.color || '#0d9488' }}>{note.initials || note.patientName?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</span>
                        {note.patientName}
                      </div>
                      <div className="text-[11px] text-[#94a3b8]">{note.date}</div>
                    </div>
                    <div className="text-[13px] text-[#475569] leading-relaxed">
                      {note.content}
                    </div>
                  </div>
                  ))}

                  {/* Add Note Button */}
                  <div className="col-span-2">
                    <button className="w-full py-3 border-2 border-dashed border-[#d1d5db] rounded-xl bg-transparent text-[#64748b] text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 hover:border-[#0d9488] hover:text-[#0d9488] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add New Note
                    </button>
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
