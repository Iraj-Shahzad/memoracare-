/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * PATIENT ROUTINES — the day's activities grouped into Morning/Afternoon/
 * Evening/Night, with a circular progress ring, a day filter (All + Mon–Sun),
 * "Read aloud", and a Weekly Report modal.
 *
 * Key concepts: routines are WEEKLY-RECURRING — runsOnDay() (using .some) does a
 * STRICT match so a routine only shows on days it's actually scheduled for (the
 * old "empty days = every day" bug is gone); useMemo caches the filtered list so
 * it isn't recomputed every render; the progress ring is an SVG circle where
 * strokeDashoffset = circumference * (1 - percent); completion status is only
 * real for TODAY (other days show as scheduled); Read-aloud uses the Web Speech API.
 * Viva line: "Weekday-recurring model with a strict day filter, memoized for
 * performance, and an SVG-stroke progress ring."
 */

import { useState, useEffect, useMemo } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import { speak, getLang } from "@/lib/speech";
import { formatTime12 } from "@/lib/time";
import { useUI } from "@/components/ui/UIProvider";

type RoutineStatus = "done" | "active" | "missed" | "upcoming";

interface RawRoutine {
  id: string;
  name: string;
  description: string;
  startTime: string;
  days: string[];
}

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHORT_TO_FULL: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};
// JS getDay(): 0=Sun..6=Sat  → our short label
const todayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];

// Static section metadata (icons/titles) — routines are filled from real data.
const SECTION_META = [
  { key: "morning", title: "Morning", iconClass: "bg-[#fef3c7]", stroke: "#f59e0b",
    icon: (<><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>) },
  { key: "afternoon", title: "Afternoon", iconClass: "bg-[#dbeafe]", stroke: "#3b82f6",
    icon: (<><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="1" y1="12" x2="3" y2="12" /></>) },
  { key: "evening", title: "Evening", iconClass: "bg-[#fce7f3]", stroke: "#ec4899",
    icon: (<><path d="M17 18a5 5 0 00-10 0" /><line x1="12" y1="9" x2="12" y2="2" /><line x1="23" y1="22" x2="1" y2="22" /></>) },
  { key: "night", title: "Night", iconClass: "bg-[#ede9fe]", stroke: "#8b5cf6",
    icon: (<><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></>) },
];

export default function RoutinesPage() {
  const { user } = useAuth();
  const { toast } = useUI();
  const patientId = (user?.profile as any)?._id || user?.id;

  const [selectedDay, setSelectedDay] = useState(todayShort);
  const [loading, setLoading] = useState(true);
  const [rawRoutines, setRawRoutines] = useState<RawRoutine[]>([]);
  const [todayStatus, setTodayStatus] = useState<Record<string, string>>({});
  const [viewAll, setViewAll] = useState(false);

  // Weekly report modal
  const [showWeekly, setShowWeekly] = useState(false);
  const [weekly, setWeekly] = useState<{ day: string; percentage: number; total: number }[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const parseHour = (t: string): number => {
    if (!t) return 9;
    const m = /(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i.exec(t);
    if (!m) return 9;
    let h = parseInt(m[1], 10);
    const ap = (m[3] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h;
  };
  const sectionForHour = (h: number) => (h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night");
  const mapStatus = (s?: string): RoutineStatus =>
    s === "completed" ? "done" : s === "missed" ? "missed" : s === "active" ? "active" : "upcoming";

  const loadData = async (silent = false) => {
    if (!patientId) return;
    try {
      if (!silent) setLoading(true);
      const [allRes, todayRes] = await Promise.all([
        apiGet(`/routines/patient/${patientId}`).catch(() => null),
        apiGet(`/routines/patient/${patientId}/today`).catch(() => null),
      ]);
      const all = Array.isArray(allRes?.routines) ? allRes.routines : [];
      setRawRoutines(all.map((r: any) => ({
        id: r._id || r.id,
        name: r.activityName || "Routine",
        description: r.description || "",
        startTime: r.startTime || "",
        days: Array.isArray(r.days) ? r.days : [],
      })));
      const statusMap: Record<string, string> = {};
      (Array.isArray(todayRes?.routines) ? todayRes.routines : []).forEach((r: any) => {
        statusMap[r._id || r.id] = r.todayStatus || "upcoming";
      });
      setTodayStatus(statusMap);
    } catch (err) {
      console.error("Routines fetch error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const isToday = selectedDay === todayShort;

  // Does this routine run on the selected weekday? Strict — a routine only
  // appears on days it is actually scheduled for (no "empty = every day").
  const runsOnDay = (days: string[], short: string) => {
    const full = (SHORT_TO_FULL[short] || "").toLowerCase();
    const sh = short.toLowerCase();
    return (days || []).some((d) => {
      const dl = String(d).toLowerCase();
      return dl === full || dl === sh || dl.slice(0, 3) === sh;
    });
  };

  // Routines to show: filtered by the selected weekday (or all days in View All).
  const visibleRoutines = useMemo(() => {
    return rawRoutines
      .filter((r) => viewAll || runsOnDay(r.days, selectedDay))
      .map((r) => ({
        ...r,
        // Real completion status only applies to today; other days show as scheduled.
        status: (viewAll || isToday ? mapStatus(todayStatus[r.id]) : "upcoming") as RoutineStatus,
      }));
  }, [rawRoutines, selectedDay, viewAll, isToday, todayStatus]);

  const sections = useMemo(() =>
    SECTION_META.map((meta) => {
      const routines = visibleRoutines.filter((r) => sectionForHour(parseHour(r.startTime)) === meta.key);
      return {
        ...meta,
        routines,
        total: routines.length,
        completed: routines.filter((r) => r.status === "done").length,
      };
    }), [visibleRoutines]);

  const totalRoutines = visibleRoutines.length;
  const totalCompleted = visibleRoutines.filter((r) => r.status === "done").length;
  const totalUpcoming = visibleRoutines.filter((r) => r.status === "upcoming" || r.status === "active").length;
  const totalMissed = visibleRoutines.filter((r) => r.status === "missed").length;
  const progressPct = totalRoutines > 0 ? Math.round((totalCompleted / totalRoutines) * 100) : 0;
  const circumference = 2 * Math.PI * 34;
  const dashOffset = circumference * (1 - progressPct / 100);

  const handleLogRoutine = async (routineId: string, status: "completed" | "missed") => {
    if (!isToday && !viewAll) return; // can only log today's routines
    try {
      await apiPost(`/routines/${routineId}/log`, { status });
      await loadData(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update routine", "error");
    }
  };

  const openWeekly = async () => {
    setShowWeekly(true);
    setWeekly([]);
    try {
      setWeeklyLoading(true);
      const res = await apiGet(`/routines/patient/${patientId}/weekly-compliance`);
      setWeekly(Array.isArray(res.weekly) ? res.weekly : []);
    } catch {
      setWeekly([]);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const getStatusBadge = (status: RoutineStatus) => {
    switch (status) {
      case "done": return { bg: "bg-[#dcfce7]", text: "text-[#16a34a]", label: "Done" };
      case "active": return { bg: "bg-[#dbeafe]", text: "text-[#0369a1]", label: "Now" };
      case "missed": return { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", label: "Missed" };
      case "upcoming": return { bg: "bg-[#fef3c7]", text: "text-[#d97706]", label: isToday || viewAll ? "Upcoming" : "Scheduled" };
      default: return { bg: "bg-[#f1f5f9]", text: "text-[#64748b]", label: "" };
    }
  };
  const getDotStyle = (status: RoutineStatus) => {
    switch (status) {
      case "done": return "bg-[#16a34a] border-[#16a34a]";
      case "active": return "bg-[#0d9488] border-[#0d9488] shadow-[0_0_0_4px_rgba(13,148,136,0.2)]";
      case "missed": return "bg-[#ef4444] border-[#ef4444]";
      default: return "bg-white border-[#e2e8f0]";
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex min-h-screen bg-[#f5f6f5]">
          <PatientSidebar />
          <div className="ml-0 md:ml-[260px] flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b]">Loading routines...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
    <div className="flex min-h-screen bg-[#f5f6f5]">
      <PatientSidebar />

      <main className="flex-1 ml-0 md:ml-[260px]">
        <Topbar title="Daily Routines" subtitle={todayStr} showSOS={true} />

        <div style={{ padding: "24px 32px" }}>
          {/* Progress Banner */}
          <div className="rounded-2xl text-white flex flex-wrap gap-3 items-center justify-between" style={{ background: "linear-gradient(135deg, #1a3c34, #0d9488)", padding: "24px 28px", marginBottom: 24 }}>
            <div className="flex items-center gap-5">
              <div className="relative" style={{ width: 80, height: 80 }}>
                <svg viewBox="0 0 80 80" style={{ width: 80, height: 80, transform: "rotate(-90deg)" }}>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-500" />
                </svg>
                <span className="absolute font-extrabold text-[18px]" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>{progressPct}%</span>
              </div>
              <div>
                <div className="text-[13px] opacity-80">{isToday && !viewAll ? "Today's Progress" : `${viewAll ? "All routines" : SHORT_TO_FULL[selectedDay]}`}</div>
                <div className="text-[20px] font-bold mt-1">{totalCompleted} of {totalRoutines} Routines Completed</div>
                <div className="text-[14px] opacity-90 mt-1">
                  {totalRoutines === 0 ? "No routines scheduled." : totalRoutines - totalCompleted > 0 ? `${totalRoutines - totalCompleted} more to go` : "All done — great job!"}
                </div>
              </div>
            </div>
            <div className="flex gap-[10px]">
              <button
                onClick={() => {
                  if (visibleRoutines.length === 0) { speak("No routines scheduled.", getLang()); return; }
                  const spoken = visibleRoutines.map((r) => `${r.name} at ${formatTime12(r.startTime)}`).join(", ");
                  speak(`You have ${visibleRoutines.length} routines. ${spoken}.`, getLang());
                }}
                className="rounded-[10px] text-[14px] font-semibold border-none cursor-pointer flex items-center gap-2"
                style={{ padding: "10px 24px", background: "#fff", color: "#1a3c34" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" style={{ width: 18, height: 18 }}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /><path d="M19.07 4.93a10 10 0 010 14.14" /></svg>
                Read aloud
              </button>
              <button onClick={openWeekly} className="rounded-[10px] text-[14px] font-semibold cursor-pointer text-white" style={{ padding: "10px 24px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                Weekly Report
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="text-[28px] font-extrabold text-[#1a3c34]">{totalRoutines}</div>
              <div className="text-[13px] text-[#64748b] mt-0.5">Total Routines</div>
            </div>
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="text-[28px] font-extrabold text-[#16a34a]">{totalCompleted}</div>
              <div className="text-[13px] text-[#64748b] mt-0.5">Completed</div>
            </div>
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="text-[28px] font-extrabold text-[#d97706]">{totalUpcoming}</div>
              <div className="text-[13px] text-[#64748b] mt-0.5">Upcoming</div>
            </div>
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="text-[28px] font-extrabold text-[#dc2626]">{totalMissed}</div>
              <div className="text-[13px] text-[#64748b] mt-0.5">Missed</div>
            </div>
          </div>

          {/* Day Selector: 'All' shows every routine; a day shows only that day's. */}
          <div className="flex gap-2 flex-wrap" style={{ marginBottom: 24 }}>
            <button
              onClick={() => setViewAll(true)}
              className={`rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all ${viewAll ? "bg-[#0d9488] text-white" : "bg-white text-[#64748b] hover:bg-[#f0fdf4] hover:text-[#1a3c34]"}`}
              style={{ padding: "10px 20px", border: "1px solid", borderColor: viewAll ? "#0d9488" : "#e2e8f0" }}
            >
              All
            </button>
            {SHORT_DAYS.map((day) => {
              const active = !viewAll && selectedDay === day;
              return (
              <button
                key={day}
                onClick={() => { setViewAll(false); setSelectedDay(day); }}
                className={`rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all ${active ? "bg-[#0d9488] text-white" : "bg-white text-[#64748b] hover:bg-[#f0fdf4] hover:text-[#1a3c34]"}`}
                style={{ padding: "10px 20px", border: "1px solid", borderColor: active ? "#0d9488" : "#e2e8f0" }}
              >
                {day}{day === todayShort ? " •" : ""}
              </button>
              );
            })}
          </div>

          {totalRoutines === 0 ? (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl text-center" style={{ padding: 48 }}>
              <p className="text-[#64748b] font-medium">No routines for {viewAll ? "any day" : SHORT_TO_FULL[selectedDay]}</p>
              <p className="text-[#94a3b8] text-sm mt-1">Your caregiver can add routines for you.</p>
            </div>
          ) : (
          /* Timeline Sections */
          sections.filter((s) => s.total > 0).map((section) => (
            <div key={section.key} style={{ marginBottom: 32 }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
                <div className={`flex items-center justify-center rounded-[10px] ${section.iconClass}`} style={{ width: 40, height: 40 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={section.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>{section.icon}</svg>
                </div>
                <div>
                  <div className="text-[16px] font-bold text-[#1a3c34]">{section.title}</div>
                  <div className="text-[13px] text-[#64748b]">{section.completed} of {section.total} completed</div>
                </div>
              </div>

              <div className="relative" style={{ paddingLeft: 24 }}>
                <div className="absolute bg-[#e2e8f0]" style={{ left: 11, top: 0, bottom: 0, width: 2 }} />
                {section.routines.map((routine) => {
                  const badge = getStatusBadge(routine.status);
                  const dotClass = getDotStyle(routine.status);
                  // Completion is only real for TODAY, so only allow ticking a
                  // routine that actually runs today: either we're viewing today
                  // directly, or we're in "All" and this routine is scheduled today.
                  const canLog =
                    routine.status !== "done" &&
                    ((!viewAll && isToday) || (viewAll && runsOnDay(routine.days, todayShort)));
                  return (
                    <div key={routine.id} className="relative flex items-center justify-between bg-white rounded-[14px] border border-[#e2e8f0] hover:border-[#0d9488] transition-all" style={{ padding: 20, marginBottom: 12, marginLeft: 24 }}>
                      <div className={`absolute rounded-full border-[3px] ${dotClass}`} style={{ width: 14, height: 14, left: -33, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
                      <div className="flex items-center gap-4">
                        <div
                          onClick={() => canLog && handleLogRoutine(routine.id, "completed")}
                          className={`flex items-center justify-center rounded-[6px] border-2 flex-shrink-0 ${routine.status === "done" ? "bg-[#16a34a] border-[#16a34a]" : "border-[#d1d5db] bg-white"} ${canLog ? "cursor-pointer" : "cursor-default"}`}
                          style={{ width: 24, height: 24 }}
                          title={canLog ? "Mark as done" : undefined}
                        >
                          {routine.status === "done" && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                        <div>
                          <h4 className={`text-[15px] font-semibold text-[#1a3c34] ${routine.status === "done" ? "line-through opacity-60" : ""}`}>{routine.name}</h4>
                          {routine.description && <p className="text-[13px] text-[#64748b] mt-0.5">{routine.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-semibold text-[#1a3c34] rounded-[8px]" style={{ background: "#f1f5f9", padding: "6px 14px" }}>{formatTime12(routine.startTime)}</span>
                        <span className={`${badge.bg} ${badge.text} text-[12px] font-semibold rounded-[20px]`} style={{ padding: "4px 12px" }}>{badge.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )))}
        </div>
      </main>

      {/* Weekly Report modal */}
      {showWeekly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowWeekly(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1a3c34]">Weekly Routine Report</h3>
              <button onClick={() => setShowWeekly(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            {weeklyLoading ? (
              <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" /></div>
            ) : weekly.every((d) => d.total === 0) ? (
              <p className="text-sm text-slate-500 py-6 text-center">No routine activity logged in the last 7 days yet.</p>
            ) : (
              <div className="space-y-3">
                {weekly.map((d) => (
                  <div key={d.day} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{d.day}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-40 bg-slate-200 rounded-full h-2"><div className="bg-[#0d9488] h-2 rounded-full" style={{ width: `${d.percentage}%` }} /></div>
                      <span className="text-sm font-semibold text-slate-700 w-12 text-right">{d.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
