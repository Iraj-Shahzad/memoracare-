/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useMemo, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface ActivityEntry {
  id: string;
  date: string; // ISO date
  time: string;
  type: "medication_taken" | "medication_missed" | "routine_completed" | "routine_missed" | "face_recognition" | "chatbot" | "sos";
  title: string;
  description: string;
  status: "completed" | "missed" | "warning" | "emergency";
}

const defaultActivityData: ActivityEntry[] = [
  // Today - April 14, 2026
  {
    id: "1",
    date: "2026-04-14",
    time: "9:00 AM",
    type: "medication_taken",
    title: "Medication Taken",
    description: "Donepezil 10mg",
    status: "completed",
  },
  {
    id: "2",
    date: "2026-04-14",
    time: "9:30 AM",
    type: "routine_completed",
    title: "Routine Completed",
    description: "Morning Walk",
    status: "completed",
  },
  {
    id: "3",
    date: "2026-04-14",
    time: "10:15 AM",
    type: "face_recognition",
    title: "Face Recognition",
    description: "Identified Fatima Khan",
    status: "completed",
  },
  {
    id: "4",
    date: "2026-04-14",
    time: "11:00 AM",
    type: "chatbot",
    title: "Chatbot",
    description: "Asked about next medication",
    status: "completed",
  },
  {
    id: "5",
    date: "2026-04-14",
    time: "2:00 PM",
    type: "medication_missed",
    title: "Medication Missed",
    description: "Memantine 5mg",
    status: "missed",
  },
  {
    id: "6",
    date: "2026-04-14",
    time: "3:30 PM",
    type: "sos",
    title: "SOS Alert Triggered",
    description: "Emergency assistance requested",
    status: "emergency",
  },

  // Yesterday - April 13, 2026
  {
    id: "7",
    date: "2026-04-13",
    time: "8:30 AM",
    type: "medication_taken",
    title: "Medication Taken",
    description: "Donepezil 10mg",
    status: "completed",
  },
  {
    id: "8",
    date: "2026-04-13",
    time: "9:00 AM",
    type: "routine_completed",
    title: "Routine Completed",
    description: "Namaz Fajr",
    status: "completed",
  },
  {
    id: "9",
    date: "2026-04-13",
    time: "12:00 PM",
    type: "face_recognition",
    title: "Face Recognition",
    description: "Unknown person detected",
    status: "warning",
  },
  {
    id: "10",
    date: "2026-04-13",
    time: "2:00 PM",
    type: "medication_taken",
    title: "Medication Taken",
    description: "Memantine 5mg",
    status: "completed",
  },
  {
    id: "11",
    date: "2026-04-13",
    time: "5:00 PM",
    type: "routine_missed",
    title: "Routine Missed",
    description: "Evening Walk",
    status: "missed",
  },

  // April 12, 2026
  {
    id: "12",
    date: "2026-04-12",
    time: "8:00 AM",
    type: "medication_taken",
    title: "Medication Taken",
    description: "Donepezil 10mg",
    status: "completed",
  },
  {
    id: "13",
    date: "2026-04-12",
    time: "9:15 AM",
    type: "routine_completed",
    title: "Routine Completed",
    description: "Morning Stretch",
    status: "completed",
  },
  {
    id: "14",
    date: "2026-04-12",
    time: "1:00 PM",
    type: "medication_taken",
    title: "Medication Taken",
    description: "Galantamine 8mg",
    status: "completed",
  },
  {
    id: "15",
    date: "2026-04-12",
    time: "4:30 PM",
    type: "chatbot",
    title: "Chatbot",
    description: "Discussed medication schedule",
    status: "completed",
  },
];

export default function ActivityLog() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;
  const userName = user?.name || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const [activityData, setActivityData] = useState<ActivityEntry[]>(defaultActivityData);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 156, medsTaken: 89, routinesCompleted: 42, faceRecognitions: 25 });

  const itemsPerPage = 10;

  useEffect(() => {
    if (!patientId) return;
    const fetchActivityLog = async () => {
      try {
        setLoading(true);
        const res = await apiGet(`/patients/${patientId}/activity-log`).catch(() => null);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((a: any, idx: number) => ({
            id: a._id || a.id || String(idx + 1),
            date: a.date ? a.date.split("T")[0] : new Date().toISOString().split("T")[0],
            time: a.time || new Date(a.date || a.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            type: a.type || "medication_taken",
            title: a.title || a.action || "Activity",
            description: a.description || a.details || "",
            status: a.status || "completed",
          }));
          setActivityData(mapped);
          // Update stats from data
          setStats({
            total: mapped.length,
            medsTaken: mapped.filter((a: any) => a.type === "medication_taken").length,
            routinesCompleted: mapped.filter((a: any) => a.type === "routine_completed").length,
            faceRecognitions: mapped.filter((a: any) => a.type === "face_recognition").length,
          });
        }
      } catch (err) {
        console.error("Activity log fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivityLog();
  }, [patientId]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activityData.filter((activity) => {
      // Type filter
      if (selectedType !== "all") {
        const typeMap: { [key: string]: string[] } = {
          medications: ["medication_taken", "medication_missed"],
          routines: ["routine_completed", "routine_missed"],
          face_recognition: ["face_recognition"],
          chatbot: ["chatbot"],
          emergency: ["sos"],
        };
        if (!typeMap[selectedType]?.includes(activity.type)) {
          return false;
        }
      }

      // Date filter
      if (dateFrom && activity.date < dateFrom) return false;
      if (dateTo && activity.date > dateTo) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          activity.title.toLowerCase().includes(query) ||
          activity.description.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [activityData, selectedType, dateFrom, dateTo, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, startIndex + itemsPerPage);

  // Group by date
  const groupedActivities = useMemo(() => {
    const grouped: { [key: string]: ActivityEntry[] } = {};
    paginatedActivities.forEach((activity) => {
      if (!grouped[activity.date]) {
        grouped[activity.date] = [];
      }
      grouped[activity.date].push(activity);
    });
    return Object.entries(grouped).sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
  }, [paginatedActivities]);

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split("T")[0]) {
      return "Today";
    } else if (dateStr === yesterday.toISOString().split("T")[0]) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
  };

  const getActivityColor = (status: string, type: string): { dot: string; icon: string; badge: string } => {
    if (status === "completed" && (type === "medication_taken" || type === "routine_completed")) {
      return {
        dot: "#22c55e",
        icon: "#16a34a",
        badge: "bg-green-100 text-green-700",
      };
    } else if (status === "missed") {
      return {
        dot: "#ef4444",
        icon: "#dc2626",
        badge: "bg-red-100 text-red-700",
      };
    } else if (status === "emergency") {
      return {
        dot: "#ef4444",
        icon: "#dc2626",
        badge: "bg-red-100 text-red-700",
      };
    } else if (type === "face_recognition" && status === "completed") {
      return {
        dot: "#3b82f6",
        icon: "#1d4ed8",
        badge: "bg-blue-100 text-blue-700",
      };
    } else if (type === "face_recognition" && status === "warning") {
      return {
        dot: "#f97316",
        icon: "#ea580c",
        badge: "bg-orange-100 text-orange-700",
      };
    } else if (type === "chatbot") {
      return {
        dot: "#a855f7",
        icon: "#7e22ce",
        badge: "bg-purple-100 text-purple-700",
      };
    }
    return {
      dot: "#64748b",
      icon: "#475569",
      badge: "bg-slate-100 text-slate-700",
    };
  };

  const getActivityIcon = (type: string): JSX.Element => {
    switch (type) {
      case "medication_taken":
      case "medication_missed":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="16" y2="14" />
          </svg>
        );
      case "routine_completed":
      case "routine_missed":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case "face_recognition":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 21v-1a5 5 0 0110 0v1" />
          </svg>
        );
      case "chatbot":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        );
      case "sos":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      default:
        return <div />;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex h-screen bg-white">
          <PatientSidebar />
          <div className="ml-[260px] flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b]">Loading activity log...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <PatientSidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[260px] flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar title="Activity Log" subtitle="Track your health and daily activities" avatar={initials} showSOS={true} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-[#f0fdf4]">
          <div className="px-8 py-6 space-y-6 pb-8">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              {/* Total Activities */}
              <div className="bg-white rounded-[15px] p-5 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] text-slate-600 font-medium mb-1">Total Activities</p>
                    <p className="text-3xl font-bold text-[#1a3c34]">{stats.total}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" className="w-6 h-6">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">All tracked activities</p>
              </div>

              {/* Medications Taken */}
              <div className="bg-white rounded-[15px] p-5 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] text-slate-600 font-medium mb-1">Medications Taken</p>
                    <p className="text-3xl font-bold text-[#1a3c34]">{stats.medsTaken}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" className="w-6 h-6">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="8" y1="10" x2="16" y2="10" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">Successfully taken</p>
              </div>

              {/* Routines Completed */}
              <div className="bg-white rounded-[15px] p-5 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] text-slate-600 font-medium mb-1">Routines Completed</p>
                    <p className="text-3xl font-bold text-[#1a3c34]">{stats.routinesCompleted}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" className="w-6 h-6">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">Daily routines done</p>
              </div>

              {/* Face Recognitions */}
              <div className="bg-white rounded-[15px] p-5 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] text-slate-600 font-medium mb-1">Face Recognitions</p>
                    <p className="text-3xl font-bold text-[#1a3c34]">{stats.faceRecognitions}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="w-6 h-6">
                    <rect x="2" y="2" width="20" height="20" rx="2" />
                    <circle cx="12" cy="10" r="3" />
                    <path d="M7 21v-1a5 5 0 0110 0v1" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">Successful identifications</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[15px] p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-[#1a3c34] mb-4">Filter Activities</h3>
              <div className="grid grid-cols-6 gap-4">
                {/* Date From */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>

                {/* Type Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">Activity Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => {
                      setSelectedType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white"
                  >
                    <option value="all">All</option>
                    <option value="medications">Medications</option>
                    <option value="routines">Routines</option>
                    <option value="face_recognition">Face Recognition</option>
                    <option value="chatbot">Chatbot</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSelectedType("all");
                      setDateFrom("");
                      setDateTo("");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-[8px] text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Results count */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-600">
                  Showing <span className="font-semibold">{paginatedActivities.length}</span> of{" "}
                  <span className="font-semibold">{filteredActivities.length}</span> activities
                </p>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-[15px] p-6 border border-slate-200 shadow-sm">
              {groupedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-sm">No activities found matching your filters.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedActivities.map(([date, activities]) => (
                    <div key={date}>
                      {/* Date Header */}
                      <h3 className="text-sm font-bold text-[#1a3c34] mb-4 sticky top-0 bg-white pb-2">
                        {getDateLabel(date)}
                      </h3>

                      {/* Timeline for this date */}
                      <div className="relative space-y-4 pl-8">
                        {/* Vertical line */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0d9488] to-[#0f766e]" />

                        {activities.map((activity) => {
                          const colors = getActivityColor(activity.status, activity.type);
                          return (
                            <div key={activity.id} className="relative pb-2">
                              {/* Timeline dot */}
                              <div
                                className="absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-white z-10 bg-[#f0fdf4]"
                                style={{ backgroundColor: colors.dot, borderColor: "white" }}
                              />

                              {/* Activity Card */}
                              <div className="bg-slate-50 rounded-[10px] p-4 hover:bg-slate-100 transition-colors border border-slate-200">
                                <div className="flex items-start gap-3">
                                  {/* Icon */}
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                                    style={{ backgroundColor: colors.icon }}
                                  >
                                    {getActivityIcon(activity.type)}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-slate-900 text-sm">{activity.title}</p>
                                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-[6px] ${colors.badge}`}>
                                        {activity.status === "completed"
                                          ? "Completed"
                                          : activity.status === "missed"
                                            ? "Missed"
                                            : activity.status === "emergency"
                                              ? "Emergency"
                                              : "Warning"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mb-2">{activity.description}</p>
                                    <p className="text-xs text-slate-500">{activity.time}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Divider between date groups */}
                      {groupedActivities.indexOf([date, activities] as [string, ActivityEntry[]]) <
                        groupedActivities.length - 1 && <div className="my-6 border-t border-slate-200" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-[15px] p-4 border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-600">
                  Page <span className="font-semibold">{currentPage}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-slate-300 rounded-[8px] text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-slate-300 rounded-[8px] text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
