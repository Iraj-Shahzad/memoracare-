/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";

type RoutineStatus = "done" | "active" | "missed" | "upcoming";

interface Routine {
  id: string;
  name: string;
  description: string;
  time: string;
  status: RoutineStatus;
}

interface TimeSection {
  key: string;
  title: string;
  completed: number;
  total: number;
  iconClass: string;
  iconSvg: React.ReactNode;
  routines: Routine[];
}

export default function RoutinesPage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;

  const [selectedDay, setSelectedDay] = useState("Sat");
  const [loading, setLoading] = useState(true);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [timeSections, setTimeSections] = useState<TimeSection[]>([
    {
      key: "morning",
      title: "Morning",
      completed: 4,
      total: 4,
      iconClass: "bg-[#fef3c7]",
      iconSvg: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 20, height: 20 }}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
      routines: [
        { id: "1", name: "Wake Up and Stretch", description: "Light stretching exercises for 10 minutes", time: "7:00 AM", status: "done" },
        { id: "2", name: "Take Morning Medications", description: "Aricept 10mg, Namenda 5mg, Vitamin E", time: "8:00 AM", status: "done" },
        { id: "3", name: "Breakfast", description: "Healthy breakfast with family", time: "8:30 AM", status: "done" },
        { id: "4", name: "Memory Exercise", description: "15-minute cognitive training session", time: "9:30 AM", status: "done" },
      ],
    },
    {
      key: "afternoon",
      title: "Afternoon",
      completed: 1,
      total: 3,
      iconClass: "bg-[#dbeafe]",
      iconSvg: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 20, height: 20 }}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        </svg>
      ),
      routines: [
        { id: "5", name: "Lunch", description: "Balanced meal with caregiver supervision", time: "12:30 PM", status: "done" },
        { id: "6", name: "Afternoon Medication", description: "Aricept 10mg second dose", time: "2:00 PM", status: "active" },
        { id: "7", name: "Outdoor Walk", description: "30-minute walk in the garden or park", time: "3:30 PM", status: "missed" },
      ],
    },
    {
      key: "evening",
      title: "Evening",
      completed: 1,
      total: 2,
      iconClass: "bg-[#fce7f3]",
      iconSvg: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ec4899"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 20, height: 20 }}
        >
          <path d="M17 18a5 5 0 00-10 0" />
          <line x1="12" y1="9" x2="12" y2="2" />
          <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
          <line x1="1" y1="18" x2="3" y2="18" />
          <line x1="21" y1="18" x2="23" y2="18" />
          <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
          <line x1="23" y1="22" x2="1" y2="22" />
        </svg>
      ),
      routines: [
        { id: "8", name: "Dinner", description: "Light dinner with family", time: "7:00 PM", status: "done" },
        { id: "9", name: "Evening Medication", description: "Galantamine 8mg evening dose", time: "6:00 PM", status: "upcoming" },
      ],
    },
    {
      key: "night",
      title: "Night",
      completed: 0,
      total: 1,
      iconClass: "bg-[#ede9fe]",
      iconSvg: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 20, height: 20 }}
        >
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ),
      routines: [
        { id: "10", name: "Bedtime Routine", description: "Take Melatonin 3mg, brush teeth, lights off", time: "9:30 PM", status: "upcoming" },
      ],
    },
  ]);

  useEffect(() => {
    if (!patientId) return;

    const sectionForHour = (h: number) =>
      h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
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
    const mapStatus = (s: string): RoutineStatus =>
      s === "completed" ? "done" : s === "missed" ? "missed" : s === "active" ? "active" : "upcoming";

    const fetchRoutines = async () => {
      try {
        setLoading(true);
        const res = await apiGet(`/routines/patient/${patientId}/today`).catch(() => null);
        if (res?.routines && Array.isArray(res.routines)) {
          const grouped: Record<string, Routine[]> = { morning: [], afternoon: [], evening: [], night: [] };
          res.routines.forEach((r: any) => {
            const key = sectionForHour(parseHour(r.startTime));
            grouped[key].push({
              id: r._id || r.id,
              name: r.activityName || "Routine",
              description: r.description || "",
              time: r.startTime || "",
              status: mapStatus(r.todayStatus),
            });
          });
          setTimeSections((prev) =>
            prev.map((section) => ({
              ...section,
              routines: grouped[section.key] || [],
              total: (grouped[section.key] || []).length,
              completed: (grouped[section.key] || []).filter((r) => r.status === "done").length,
            }))
          );
        }
      } catch (err) {
        console.error("Routines fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutines();
  }, [patientId]);

  const handleLogRoutine = async (routineId: string, status: "completed" | "missed") => {
    try {
      await apiPost(`/routines/${routineId}/log`, { status });
      setTimeSections(prev => prev.map(section => ({
        ...section,
        routines: section.routines.map(r =>
          r.id === routineId ? { ...r, status: status === "completed" ? "done" as const : "missed" as const } : r
        ),
        completed: section.routines.filter(r =>
          r.id === routineId ? status === "completed" : r.status === "done"
        ).length,
      })));
    } catch (err) {
      console.error("Log routine error:", err);
    }
  };

  const totalCompleted = timeSections.reduce((s, sec) => s + sec.completed, 0);
  const totalRoutines = timeSections.reduce((s, sec) => s + sec.total, 0);
  const progressPct = Math.round((totalCompleted / totalRoutines) * 100);
  const circumference = 2 * Math.PI * 34;
  const dashOffset = circumference * (1 - progressPct / 100);

  const getStatusBadge = (status: RoutineStatus) => {
    switch (status) {
      case "done":
        return { bg: "bg-[#dcfce7]", text: "text-[#16a34a]", label: "Done" };
      case "active":
        return { bg: "bg-[#dbeafe]", text: "text-[#0369a1]", label: "Now" };
      case "missed":
        return { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", label: "Missed" };
      case "upcoming":
        return { bg: "bg-[#fef3c7]", text: "text-[#d97706]", label: "Upcoming" };
      default:
        return { bg: "bg-[#f1f5f9]", text: "text-[#64748b]", label: "" };
    }
  };

  const getDotStyle = (status: RoutineStatus) => {
    switch (status) {
      case "done":
        return "bg-[#16a34a] border-[#16a34a]";
      case "active":
        return "bg-[#0d9488] border-[#0d9488] shadow-[0_0_0_4px_rgba(13,148,136,0.2)]";
      case "missed":
        return "bg-[#ef4444] border-[#ef4444]";
      default:
        return "bg-white border-[#e2e8f0]";
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
        <Topbar
          title="Daily Routines"
          subtitle="Saturday, April 12, 2026"
          showSOS={true}
        />

        <div style={{ padding: "24px 32px" }}>
          {/* Progress Banner */}
          <div
            className="rounded-2xl text-white flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, #1a3c34, #0d9488)",
              padding: "24px 28px",
              marginBottom: 24,
            }}
          >
            <div className="flex items-center gap-5">
              {/* Circular Progress */}
              <div className="relative" style={{ width: 80, height: 80 }}>
                <svg viewBox="0 0 80 80" style={{ width: 80, height: 80, transform: "rotate(-90deg)" }}>
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <span
                  className="absolute font-extrabold text-[18px]"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {progressPct}%
                </span>
              </div>
              <div>
                <div className="text-[13px] opacity-80">Today&apos;s Progress</div>
                <div className="text-[20px] font-bold mt-1">{totalCompleted} of {totalRoutines} Routines Completed</div>
                <div className="text-[14px] opacity-90 mt-1">Keep it up! {totalRoutines - totalCompleted} more routines to go today</div>
              </div>
            </div>
            <div className="flex gap-[10px]">
              <button
                className="rounded-[10px] text-[14px] font-semibold border-none cursor-pointer"
                style={{ padding: "10px 24px", background: "#fff", color: "#1a3c34" }}
              >
                View All
              </button>
              <button
                className="rounded-[10px] text-[14px] font-semibold cursor-pointer text-white"
                style={{
                  padding: "10px 24px",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                Weekly Report
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
            {/* Total Routines */}
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-[28px] font-extrabold text-[#1a3c34]">{totalRoutines}</div>
                  <div className="text-[13px] text-[#64748b] mt-0.5">Total Routines</div>
                </div>
                <div
                  className="flex items-center justify-center rounded-[10px]"
                  style={{ width: 42, height: 42, background: "#dbeafe" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 20, height: 20 }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Completed */}
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-[28px] font-extrabold text-[#1a3c34]">{totalCompleted}</div>
                  <div className="text-[13px] text-[#64748b] mt-0.5">Completed</div>
                </div>
                <div
                  className="flex items-center justify-center rounded-[10px]"
                  style={{ width: 42, height: 42, background: "#dcfce7" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 20, height: 20 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Upcoming */}
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-[28px] font-extrabold text-[#1a3c34]">{timeSections.reduce((s, sec) => s + sec.routines.filter(r => r.status === "upcoming" || r.status === "active").length, 0)}</div>
                  <div className="text-[13px] text-[#64748b] mt-0.5">Upcoming</div>
                </div>
                <div
                  className="flex items-center justify-center rounded-[10px]"
                  style={{ width: 42, height: 42, background: "#fef3c7" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 20, height: 20 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Missed */}
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-[28px] font-extrabold text-[#1a3c34]">{timeSections.reduce((s, sec) => s + sec.routines.filter(r => r.status === "missed").length, 0)}</div>
                  <div className="text-[13px] text-[#64748b] mt-0.5">Missed</div>
                </div>
                <div
                  className="flex items-center justify-center rounded-[10px]"
                  style={{ width: 42, height: 42, background: "#ede9fe" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 20, height: 20 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Day Selector */}
          <div className="flex gap-2" style={{ marginBottom: 24 }}>
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all ${
                  selectedDay === day
                    ? "bg-[#0d9488] text-white border-[#0d9488]"
                    : "bg-white text-[#64748b] border-[#e2e8f0] hover:bg-[#f0fdf4] hover:text-[#1a3c34]"
                }`}
                style={{
                  padding: "10px 20px",
                  border: "1px solid",
                  borderColor: selectedDay === day ? "#0d9488" : "#e2e8f0",
                  fontFamily: "inherit",
                }}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Timeline Sections */}
          {timeSections.map((section) => (
            <div key={section.key} style={{ marginBottom: 32 }}>
              {/* Section Header */}
              <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
                <div
                  className={`flex items-center justify-center rounded-[10px] ${section.iconClass}`}
                  style={{ width: 40, height: 40 }}
                >
                  {section.iconSvg}
                </div>
                <div>
                  <div className="text-[16px] font-bold text-[#1a3c34]">{section.title}</div>
                  <div className="text-[13px] text-[#64748b]">
                    {section.completed} of {section.total} completed
                  </div>
                </div>
              </div>

              {/* Timeline Items */}
              <div className="relative" style={{ paddingLeft: 24 }}>
                {/* Vertical line */}
                <div
                  className="absolute bg-[#e2e8f0]"
                  style={{ left: 11, top: 0, bottom: 0, width: 2 }}
                />

                {section.routines.map((routine) => {
                  const badge = getStatusBadge(routine.status);
                  const dotClass = getDotStyle(routine.status);
                  return (
                    <div
                      key={routine.id}
                      className="relative flex items-center justify-between bg-white rounded-[14px] border border-[#e2e8f0] hover:border-[#0d9488] transition-all"
                      style={{
                        padding: 20,
                        marginBottom: 12,
                        marginLeft: 24,
                      }}
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute rounded-full border-[3px] ${dotClass}`}
                        style={{
                          width: 14,
                          height: 14,
                          left: -33,
                          top: "50%",
                          transform: "translateY(-50%)",
                          zIndex: 1,
                        }}
                      />

                      {/* Left side */}
                      <div className="flex items-center gap-4">
                        {/* Checkbox */}
                        <div
                          onClick={() => routine.status !== "done" && handleLogRoutine(routine.id, "completed")}
                          className={`flex items-center justify-center rounded-[6px] border-2 cursor-pointer flex-shrink-0 ${
                            routine.status === "done"
                              ? "bg-[#16a34a] border-[#16a34a]"
                              : "border-[#d1d5db] bg-white"
                          }`}
                          style={{ width: 24, height: 24 }}
                        >
                          {routine.status === "done" && (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#fff"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 14, height: 14 }}
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h4
                            className={`text-[15px] font-semibold text-[#1a3c34] ${
                              routine.status === "done"
                                ? "line-through opacity-60"
                                : ""
                            }`}
                          >
                            {routine.name}
                          </h4>
                          <p className="text-[13px] text-[#64748b] mt-0.5">
                            {routine.description}
                          </p>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[13px] font-semibold text-[#1a3c34] rounded-[8px]"
                          style={{
                            background: "#f1f5f9",
                            padding: "6px 14px",
                          }}
                        >
                          {routine.time}
                        </span>
                        <span
                          className={`${badge.bg} ${badge.text} text-[12px] font-semibold rounded-[20px]`}
                          style={{ padding: "4px 12px" }}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
