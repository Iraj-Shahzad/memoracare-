/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

export default function Dashboard() {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patientId = (user?.profile as Record<string, any>)?._id || user?.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dashboardData, setDashboardData] = useState<Record<string, any>| null>(null);
  const [loading, setLoading] = useState(true);

  const userName = user?.name || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    if (!patientId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const dashRes = await apiGet(`/patients/${patientId}/dashboard`).catch(() => null);
        if (dashRes?.dashboard) setDashboardData(dashRes.dashboard);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId]);

  const medsTaken = dashboardData?.medications?.taken ?? 0;
  const medsTotal = dashboardData?.medications?.total ?? 0;
  const nextMedTime = dashboardData?.nextMedTime ?? "—";
  const routinesDone = dashboardData?.routines?.completed ?? 0;
  const routinesTotal = dashboardData?.routines?.total ?? 0;
  const nextRoutine = dashboardData?.nextRoutine ?? "—";
  const weeklyScore = dashboardData?.weeklyScore ?? (medsTotal > 0 ? Math.round((medsTaken / medsTotal) * 100) : 0);
  const streak = dashboardData?.streak ?? 0;

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex min-h-screen bg-[#f5f6f5]">
          <PatientSidebar />
          <div className="ml-[260px] flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b]">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
    <div className="flex min-h-screen bg-[#f5f6f5]">
      {/* Sidebar */}
      <PatientSidebar />

      {/* Main Content */}
      <div className="ml-[260px] flex-1 flex flex-col">
        {/* Topbar */}
        <Topbar
          title="Dashboard"
          greeting={`${getGreeting()}, ${userName}`}
          subtitle={`${dayName}, ${dateStr} | You have ${medsTotal} medications and ${routinesTotal} routines today`}
          avatar={initials}
          showSOS={true}
        />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-7">

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              {/* Meds Taken */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="w-10 h-10 rounded-xl bg-[#d1fae5] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Meds Taken</div>
                <div className="text-[28px] font-[800] text-[#1a3c34] leading-none">
                  {medsTaken}<span className="text-base text-[#94a3b8]"> / {medsTotal}</span>
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">Next: {nextMedTime}</div>
              </div>

              {/* Routines Done */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="w-10 h-10 rounded-xl bg-[#dbeafe] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Routines Done</div>
                <div className="text-[28px] font-[800] text-[#1a3c34] leading-none">
                  {routinesDone}<span className="text-base text-[#94a3b8]"> / {routinesTotal}</span>
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">Next: {nextRoutine}</div>
              </div>

              {/* Weekly Score */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="w-10 h-10 rounded-xl bg-[#fef3c7] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Weekly Score</div>
                <div className="text-[28px] font-[800] text-[#1a3c34] leading-none">
                  {weeklyScore}<span className="text-base text-[#94a3b8]">%</span>
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">Great progress!</div>
              </div>

              {/* Streak */}
              <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] reveal">
                <div className="w-10 h-10 rounded-xl bg-[#fce7f3] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Streak</div>
                <div className="text-[28px] font-[800] text-[#1a3c34] leading-none">
                  {streak}<span className="text-base text-[#94a3b8]"> days</span>
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">Keep it up!</div>
              </div>
            </div>

            {/* Content Grid: Medications + Routines */}
            <div className="grid grid-cols-2 gap-5">
              {/* Upcoming Medications Panel */}
              <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] reveal">
                <div className="flex justify-between items-center mb-5">
                  <div className="text-base font-bold text-[#1a3c34]">Upcoming Medications</div>
                  <a href="/patient/medications" className="text-[13px] font-semibold text-[#0d9488]">View all</a>
                </div>

                {/* Aricept */}
                <div className="flex items-center gap-3.5 p-3.5 bg-[#f9fafb] rounded-xl mb-2.5">
                  <div className="w-[42px] h-[42px] rounded-xl bg-[#d1fae5] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="2" width="12" height="20" rx="3" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#1a3c34]">Aricept (Donepezil)</div>
                    <div className="text-xs text-[#64748b] mt-0.5">10mg - 1 tablet</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-semibold text-[#0d9488]">2:00 PM</div>
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fef3c7] text-[#92400e] mt-1">Upcoming</span>
                  </div>
                </div>

                {/* Namenda */}
                <div className="flex items-center gap-3.5 p-3.5 bg-[#f9fafb] rounded-xl mb-2.5">
                  <div className="w-[42px] h-[42px] rounded-xl bg-[#dbeafe] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="2" width="12" height="20" rx="3" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#1a3c34]">Namenda (Memantine)</div>
                    <div className="text-xs text-[#64748b] mt-0.5">5mg - 1 tablet</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-semibold text-[#0d9488]">8:00 PM</div>
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#dbeafe] text-[#1e40af] mt-1">Evening</span>
                  </div>
                </div>

                {/* Vitamin D3 - Done */}
                <div className="flex items-center gap-3.5 p-3.5 bg-[#f9fafb] rounded-xl opacity-50">
                  <div className="w-[42px] h-[42px] rounded-xl bg-[#d1fae5] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#1a3c34]">Vitamin D3</div>
                    <div className="text-xs text-[#64748b] mt-0.5">1000 IU - Taken at 8:00 AM</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#d1fae5] text-[#065f46]">Done</span>
                  </div>
                </div>
              </div>

              {/* Today&apos;s Routine Panel */}
              <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] reveal">
                <div className="flex justify-between items-center mb-5">
                  <div className="text-base font-bold text-[#1a3c34]">Today&apos;s Routine</div>
                  <a href="/patient/routines" className="text-[13px] font-semibold text-[#0d9488]">View all</a>
                </div>

                {/* Morning Namaz - Done */}
                <div className="flex items-center gap-3.5 p-3.5 bg-[#f9fafb] rounded-xl mb-2.5 border-l-4 border-[#22c55e]">
                  <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3.5 h-3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1a3c34]">Morning Namaz</div>
                    <div className="text-xs text-[#64748b]">Completed at 5:30 AM</div>
                  </div>
                </div>

                {/* Breakfast - Done */}
                <div className="flex items-center gap-3.5 p-3.5 bg-[#f9fafb] rounded-xl mb-2.5 border-l-4 border-[#22c55e]">
                  <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3.5 h-3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1a3c34]">Breakfast</div>
                    <div className="text-xs text-[#64748b]">Completed at 8:30 AM</div>
                  </div>
                </div>

                {/* Lunch - Upcoming */}
                <div className="flex items-center gap-3.5 p-3.5 bg-[#f9fafb] rounded-xl mb-2.5 border-l-4 border-[#0d9488]">
                  <div className="w-6 h-6 rounded-full border-2 border-[#d1d5db] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1a3c34]">Lunch</div>
                    <div className="text-xs text-[#64748b]">Scheduled</div>
                  </div>
                  <div className="text-[13px] font-semibold text-[#1a3c34] whitespace-nowrap">1:00 PM</div>
                </div>

                {/* Evening Walk - Upcoming */}
                <div className="flex items-center gap-3.5 p-3.5 bg-[#f9fafb] rounded-xl border-l-4 border-[#0d9488]">
                  <div className="w-6 h-6 rounded-full border-2 border-[#d1d5db] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1a3c34]">Evening Walk</div>
                    <div className="text-xs text-[#64748b]">Scheduled</div>
                  </div>
                  <div className="text-[13px] font-semibold text-[#1a3c34] whitespace-nowrap">5:30 PM</div>
                </div>
              </div>

              {/* Quick Actions - spans full width */}
              <div className="col-span-2 grid grid-cols-2 gap-3">
                {/* Chat with AI */}
                <a href="/patient/chatbot" className="flex items-center gap-3.5 p-[18px] reveal bg-white rounded-[14px] border-[1.5px] border-[#e2e8f0] cursor-pointer transition-all hover:border-[#0d9488] hover:shadow-[0_4px_16px_rgba(13,148,136,0.08)]">
                  <div className="w-11 h-11 rounded-xl bg-[#dbeafe] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" className="w-[22px] h-[22px]" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1a3c34]">Chat with AI</div>
                    <div className="text-xs text-[#64748b] mt-0.5">Ask questions or get help</div>
                  </div>
                </a>

                {/* Face Recognition */}
                <a href="/patient/face-recognition" className="flex items-center gap-3.5 p-[18px] reveal bg-white rounded-[14px] border-[1.5px] border-[#e2e8f0] cursor-pointer transition-all hover:border-[#0d9488] hover:shadow-[0_4px_16px_rgba(13,148,136,0.08)]">
                  <div className="w-11 h-11 rounded-xl bg-[#f3e8ff] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" className="w-[22px] h-[22px]" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1a3c34]">Face Recognition</div>
                    <div className="text-xs text-[#64748b] mt-0.5">Identify a familiar person</div>
                  </div>
                </a>
              </div>

              {/* Caregiver Info Card - spans full width */}
              <div className="col-span-2 bg-white rounded-2xl p-6 border border-[#e2e8f0] reveal">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-base font-bold text-[#1a3c34]">My Caregiver</div>
                  <a href="#" className="text-[13px] font-semibold text-[#0d9488]">View details</a>
                </div>
                <div className="flex items-center gap-[18px]">
                  {/* Caregiver Avatar */}
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[22px] font-[800] flex-shrink-0 border-[3px] border-[#d1fae5]" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                    SA
                  </div>
                  {/* Caregiver Info */}
                  <div className="flex-1">
                    <div className="text-base font-bold text-[#1a3c34]">Sarah Ahmed</div>
                    <div className="text-[13px] text-[#64748b] mt-0.5">Primary Caregiver - Daughter</div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-[#64748b]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                      </svg>
                      +92 312 9876543
                    </div>
                  </div>
                  {/* Caregiver Action Buttons */}
                  <div className="flex gap-2.5 flex-shrink-0">
                    <button className="flex items-center gap-1.5 px-[18px] py-2.5 rounded-[10px] text-[13px] font-semibold bg-[#0d9488] text-white hover:bg-[#0f766e] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                      </svg>
                      Call
                    </button>
                    <button className="flex items-center gap-1.5 px-[18px] py-2.5 rounded-[10px] text-[13px] font-semibold bg-white text-[#1a3c34] border-[1.5px] border-[#e2e8f0] hover:border-[#0d9488] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Message
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
