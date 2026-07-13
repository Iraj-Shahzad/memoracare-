/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

type FilterTab = "all" | "taken" | "upcoming" | "missed";

interface MedSchedule {
  time: string;
  status: "done" | "active" | "missed" | "upcoming";
}

interface Medication {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  type: string;
  purpose: string;
  frequency: string;
  schedules: MedSchedule[];
  prescribedBy: string;
  compliance: number;
  complianceLevel: "high" | "med" | "low";
  status: "taken" | "upcoming" | "missed";
  iconBg: string;
  iconStroke: string;
  iconPath: React.ReactNode;
}

export default function MedicationsPage() {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patientId = (user?.profile as Record<string, any>)?._id || user?.id;

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [complianceStats, setComplianceStats] = useState<Record<string, any> | null>(null);

  const defaultIconPath = (
    <>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </>
  );

  const [medications, setMedications] = useState<Medication[]>([]);

  useEffect(() => {
    if (!patientId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [medRes, compRes] = await Promise.all([
          apiGet(`/medications/patient/${patientId}`).catch(() => null),
          apiGet(`/medications/patient/${patientId}/compliance`).catch(() => null),
        ]);
        if (medRes?.data && Array.isArray(medRes.data) && medRes.data.length > 0) {
          const mapped = medRes.data.map((m: any) => ({
            id: m._id || m.id,
            name: m.name || m.brandName || "Unknown",
            genericName: m.genericName || m.name || "",
            dosage: m.dosage || "",
            type: m.type || "Tablet",
            purpose: m.purpose || "",
            frequency: m.frequency || "Once Daily",
            schedules: m.schedules || [{ time: "8:00 AM", status: "upcoming" }],
            prescribedBy: m.prescribedBy || "Doctor",
            compliance: m.compliance || 80,
            complianceLevel: (m.compliance || 80) >= 85 ? "high" : (m.compliance || 80) >= 70 ? "med" : "low",
            status: m.status || "upcoming",
            iconBg: "#dbeafe",
            iconStroke: "#3b82f6",
            iconPath: defaultIconPath,
          }));
          setMedications(mapped);
        }
        if (compRes?.data) setComplianceStats(compRes.data);
      } catch (err) {
        console.error("Medications fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId]);

  const handleMarkTaken = async (medId: string) => {
    try {
      await apiPost(`/medications/${medId}/log`, { status: "taken" });
      setMedications(prev => prev.map(m => m.id === medId ? { ...m, status: "taken" as const } : m));
    } catch (err) {
      console.error("Mark taken error:", err);
    }
  };

  const handleMarkMissed = async (medId: string) => {
    try {
      await apiPost(`/medications/${medId}/log`, { status: "missed" });
      setMedications(prev => prev.map(m => m.id === medId ? { ...m, status: "missed" as const } : m));
    } catch (err) {
      console.error("Mark missed error:", err);
    }
  };

  const handleDeleteMed = async (medId: string) => {
    try {
      await apiDelete(`/medications/${medId}`);
      setMedications(prev => prev.filter(m => m.id !== medId));
    } catch (err) {
      console.error("Delete medication error:", err);
    }
  };

  const filteredMeds = medications.filter((med) => {
    const matchesFilter =
      activeFilter === "all" || med.status === activeFilter;
    const matchesSearch =
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.genericName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "taken", label: "Taken" },
    { key: "upcoming", label: "Upcoming" },
    { key: "missed", label: "Missed" },
  ];

  const getScheduleTimeClass = (status: string) => {
    switch (status) {
      case "done":
        return "bg-[#dcfce7] text-[#16a34a] line-through opacity-70";
      case "active":
        return "bg-[#0d9488] text-white";
      case "missed":
        return "bg-[#fee2e2] text-[#dc2626]";
      default:
        return "bg-[#e0f2fe] text-[#0369a1]";
    }
  };

  const getComplianceColor = (level: string) => {
    switch (level) {
      case "high":
        return { bar: "bg-[#16a34a]", text: "text-[#16a34a]" };
      case "med":
        return { bar: "bg-[#f59e0b]", text: "text-[#d97706]" };
      case "low":
        return { bar: "bg-[#ef4444]", text: "text-[#ef4444]" };
      default:
        return { bar: "bg-[#16a34a]", text: "text-[#16a34a]" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "taken":
        return { bg: "bg-[#dcfce7]", text: "text-[#16a34a]", label: "Taken" };
      case "upcoming":
        return { bg: "bg-[#fef3c7]", text: "text-[#d97706]", label: "Upcoming" };
      case "missed":
        return { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", label: "Missed" };
      default:
        return { bg: "bg-[#f1f5f9]", text: "text-[#64748b]", label: status };
    }
  };

  const totalMeds = medications.length;
  const takenToday = medications.filter(m => m.status === "taken").length;
  const missedToday = medications.filter(m => m.status === "missed").length;
  const weeklyCompliance = complianceStats?.weeklyCompliance ?? 87;

  const nextMed = medications.find(m => m.status === "upcoming");

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex min-h-screen bg-[#f5f6f5]">
          <PatientSidebar />
          <div className="ml-[260px] flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b]">Loading medications...</p>
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

      <main className="flex-1 ml-[260px]">
        <Topbar
          title="Medications"
          subtitle="Manage and track all medication schedules"
          showSOS={true}
        />

        <div style={{ padding: "24px 32px" }}>
          {/* Next Dose Banner */}
          <div
            className="rounded-2xl flex items-center justify-between text-white"
            style={{
              background: "linear-gradient(135deg, #1a3c34, #0d9488)",
              padding: "20px 28px",
              marginBottom: 24,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex items-center justify-center rounded-[14px]"
                style={{
                  width: 52,
                  height: 52,
                  background: "rgba(255,255,255,0.15)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 26, height: 26 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] opacity-80">Next Dose Coming Up</div>
                <div className="text-[18px] font-bold">{nextMed ? `${nextMed.name} ${nextMed.dosage}` : "Aricept (Donepezil) 10mg"}</div>
                <div className="text-[14px] opacity-90 mt-0.5">Today at {nextMed?.schedules?.[0]?.time || "2:00 PM"}</div>
              </div>
            </div>
            <div className="flex gap-[10px]">
              <button
                onClick={() => nextMed && handleMarkTaken(nextMed.id)}
                className="rounded-[10px] text-[14px] font-semibold border-none cursor-pointer"
                style={{ padding: "10px 24px", background: "#fff", color: "#1a3c34" }}
              >
                Mark as Taken
              </button>
              <button
                onClick={() => nextMed && handleMarkMissed(nextMed.id)}
                className="rounded-[10px] text-[14px] font-semibold cursor-pointer text-white"
                style={{
                  padding: "10px 24px",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                Skip
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
            {/* Total Medications */}
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-[28px] font-extrabold text-[#1a3c34]">{totalMeds}</div>
                  <div className="text-[13px] text-[#64748b] mt-0.5">Total Medications</div>
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
                    <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18h6" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Taken Today */}
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-[28px] font-extrabold text-[#1a3c34]">{takenToday}/{medications.reduce((s, m) => s + m.schedules.length, 0)}</div>
                  <div className="text-[13px] text-[#64748b] mt-0.5">Taken Today</div>
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
            {/* Missed Today */}
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-[28px] font-extrabold text-[#1a3c34]">{missedToday}</div>
                  <div className="text-[13px] text-[#64748b] mt-0.5">Missed Today</div>
                </div>
                <div
                  className="flex items-center justify-center rounded-[10px]"
                  style={{ width: 42, height: 42, background: "#fee2e2" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
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
            {/* Weekly Compliance */}
            <div className="bg-white rounded-[14px] border border-[#e2e8f0]" style={{ padding: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-[28px] font-extrabold text-[#1a3c34]">{weeklyCompliance}%</div>
                  <div className="text-[13px] text-[#64748b] mt-0.5">Weekly Compliance</div>
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
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 24 }}>
            <div className="flex bg-white rounded-[10px] overflow-hidden border border-[#e2e8f0]">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`text-[13px] font-semibold border-none cursor-pointer transition-all ${
                    activeFilter === tab.key
                      ? "bg-[#0d9488] text-white"
                      : "bg-transparent text-[#64748b] hover:bg-[#f0fdf4] hover:text-[#1a3c34]"
                  }`}
                  style={{ padding: "10px 20px", fontFamily: "inherit" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-[10px] flex-1"
              style={{ padding: "10px 16px", maxWidth: 300 }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                className="flex-shrink-0"
                style={{ width: 18, height: 18 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search medications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none outline-none text-[13px] text-[#1a3c34] w-full bg-transparent placeholder-[#94a3b8]"
                style={{ fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Medications Table */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  {["Medication", "Dosage", "Frequency", "Schedule", "Prescribed By", "Compliance", "Status", "Actions"].map(
                    (header) => (
                      <th
                        key={header}
                        className="text-left text-[12px] font-bold text-[#64748b] uppercase tracking-wider"
                        style={{
                          padding: "14px 20px",
                          borderBottom: "1px solid #e2e8f0",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredMeds.map((med, idx) => {
                  const statusBadge = getStatusBadge(med.status);
                  const compColors = getComplianceColor(med.complianceLevel);
                  return (
                    <tr
                      key={med.id}
                      className="hover:bg-[#f0fdf4] transition-colors"
                      style={{
                        borderBottom:
                          idx < filteredMeds.length - 1
                            ? "1px solid #f1f5f9"
                            : "none",
                      }}
                    >
                      {/* Medication */}
                      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center rounded-[10px] flex-shrink-0"
                            style={{
                              width: 40,
                              height: 40,
                              background: med.iconBg,
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                width: 20,
                                height: 20,
                                stroke: med.iconStroke,
                              }}
                            >
                              {med.iconPath}
                            </svg>
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-[#1a3c34]">
                              {med.name}
                            </div>
                            <div className="text-[12px] text-[#64748b]">
                              {med.purpose}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Dosage */}
                      <td
                        className="text-[14px] text-[#1a3c34]"
                        style={{ padding: "16px 20px", verticalAlign: "middle" }}
                      >
                        {med.dosage}
                      </td>
                      {/* Frequency */}
                      <td
                        className="text-[14px] text-[#1a3c34]"
                        style={{ padding: "16px 20px", verticalAlign: "middle" }}
                      >
                        {med.frequency}
                      </td>
                      {/* Schedule */}
                      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                        <div className="flex gap-1.5 flex-wrap">
                          {med.schedules.map((schedule, sIdx) => (
                            <span
                              key={sIdx}
                              className={`rounded-[5px] text-[11px] font-semibold ${getScheduleTimeClass(
                                schedule.status
                              )}`}
                              style={{ padding: "3px 8px" }}
                            >
                              {schedule.time}
                            </span>
                          ))}
                        </div>
                      </td>
                      {/* Prescribed By */}
                      <td
                        className="text-[14px] text-[#1a3c34]"
                        style={{ padding: "16px 20px", verticalAlign: "middle" }}
                      >
                        {med.prescribedBy}
                      </td>
                      {/* Compliance */}
                      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                        <div className="flex items-center gap-[10px]">
                          <div
                            className="rounded-[3px] overflow-hidden"
                            style={{
                              width: 80,
                              height: 6,
                              background: "#e2e8f0",
                            }}
                          >
                            <div
                              className={`h-full rounded-[3px] ${compColors.bar}`}
                              style={{ width: `${med.compliance}%` }}
                            />
                          </div>
                          <span
                            className={`text-[13px] font-semibold ${compColors.text}`}
                          >
                            {med.compliance}%
                          </span>
                        </div>
                      </td>
                      {/* Status */}
                      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                        <span
                          className={`${statusBadge.bg} ${statusBadge.text} text-[12px] font-semibold rounded-[20px]`}
                          style={{ padding: "4px 12px", whiteSpace: "nowrap" }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                        <div className="flex gap-1.5">
                          {/* Check/Take */}
                          <button
                            onClick={() => handleMarkTaken(med.id)}
                            className="flex items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-white cursor-pointer hover:border-[#0d9488] hover:bg-[#f0fdf4] transition-all"
                            style={{ width: 34, height: 34 }}
                            title="Mark as Taken"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 16, height: 16 }}
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                          {/* Info */}
                          <button
                            className="flex items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-white cursor-pointer hover:border-[#0d9488] hover:bg-[#f0fdf4] transition-all"
                            style={{ width: 34, height: 34 }}
                            title="View Details"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 16, height: 16 }}
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </button>
                          {/* Edit */}
                          <button
                            className="flex items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-white cursor-pointer hover:border-[#0d9488] hover:bg-[#f0fdf4] transition-all"
                            style={{ width: 34, height: 34 }}
                            title="Edit"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 16, height: 16 }}
                            >
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredMeds.length === 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl text-center" style={{ padding: 48 }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                className="mx-auto"
                style={{ width: 64, height: 64, marginBottom: 16 }}
              >
                <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18h6" />
              </svg>
              <p className="text-[#64748b] font-medium">No medications found</p>
              <p className="text-[#94a3b8] text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
