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
  instructions?: string;
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
  const [detailMed, setDetailMed] = useState<Medication | null>(null);

  const loadData = async (silent = false) => {
    if (!patientId) return;
    try {
      if (!silent) setLoading(true);
      const [medRes, compRes] = await Promise.all([
        apiGet(`/medications/patient/${patientId}`).catch(() => null),
        apiGet(`/medications/patient/${patientId}/compliance`).catch(() => null),
      ]);
      const list = Array.isArray(medRes?.medications) ? medRes.medications : [];
      const mapped = list.map((m: any) => {
        // Real today-status from the backend log lookup.
        const status: "taken" | "upcoming" | "missed" =
          m.todayStatus === "taken" ? "taken"
          : (m.todayStatus === "missed" || m.todayStatus === "skipped") ? "missed"
          : "upcoming";
        const times: string[] = Array.isArray(m.times) ? m.times : [];
        const schedStatus = status === "taken" ? "done" : status === "missed" ? "missed" : "upcoming";
        const schedules: MedSchedule[] = times.length
          ? times.map((t) => ({ time: t, status: schedStatus as MedSchedule["status"] }))
          : [{ time: "—", status: "upcoming" }];
        const compliance = typeof m.compliance === "number" ? m.compliance : 0;
        return {
          id: m._id || m.id,
          name: m.name || "Unknown",
          genericName: m.genericName || m.name || "",
          dosage: m.dosage || "",
          type: m.type || "Tablet",
          purpose: m.purpose || m.instructions || "",
          frequency: m.frequency || "Once Daily",
          schedules,
          prescribedBy: m.prescribedBy || m.addedBy?.name || "Caregiver",
          compliance,
          complianceLevel: (compliance >= 85 ? "high" : compliance >= 70 ? "med" : "low") as "high" | "med" | "low",
          status,
          instructions: m.instructions || "",
          iconBg: "#dbeafe",
          iconStroke: "#3b82f6",
          iconPath: defaultIconPath,
        };
      });
      setMedications(mapped);
      if (compRes?.stats) setComplianceStats(compRes.stats);
    } catch (err) {
      console.error("Medications fetch error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Marking is idempotent per day on the backend; we refetch to reflect the
  // real updated status + compliance (consistent for any medication).
  const handleMarkTaken = async (medId: string) => {
    try { await apiPost(`/medications/${medId}/log`, { status: "taken" }); await loadData(true); }
    catch (err) { alert(err instanceof Error ? err.message : "Could not mark as taken"); }
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
  const weeklyCompliance = complianceStats?.complianceRate ?? complianceStats?.weeklyCompliance ?? 0;

  const nextMed = medications.find(m => m.status === "upcoming");

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex min-h-screen bg-[#f5f6f5]">
          <PatientSidebar />
          <div className="ml-0 md:ml-[260px] flex-1 flex items-center justify-center">
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

      <main className="flex-1 ml-0 md:ml-[260px]">
        <Topbar
          title="Medications"
          subtitle="Manage and track all medication schedules"
          showSOS={true}
        />

        <div style={{ padding: "24px 32px" }}>
          {/* Next Dose Banner */}
          <div
            className="rounded-2xl flex flex-wrap gap-3 items-center justify-between text-white"
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
                <div className="text-[18px] font-bold">{nextMed ? `${nextMed.name} ${nextMed.dosage}` : "All doses handled"}</div>
                <div className="text-[14px] opacity-90 mt-0.5">{nextMed ? `Scheduled at ${nextMed.schedules?.[0]?.time || "—"}` : "No upcoming doses right now"}</div>
              </div>
            </div>
            {nextMed && (
            <div className="flex gap-[10px]">
              <button
                onClick={() => handleMarkTaken(nextMed.id)}
                className="rounded-[10px] text-[14px] font-semibold border-none cursor-pointer"
                style={{ padding: "10px 24px", background: "#fff", color: "#1a3c34" }}
              >
                Mark as Taken
              </button>
            </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
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
            <div className="overflow-x-auto">
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
                          {/* Mark as Taken */}
                          <button
                            onClick={() => handleMarkTaken(med.id)}
                            disabled={med.status === "taken"}
                            className="flex items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-white cursor-pointer hover:border-[#16a34a] hover:bg-[#f0fdf4] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ width: 34, height: 34 }}
                            title="Mark as Taken"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke={med.status === "taken" ? "#16a34a" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                          {/* View Details */}
                          <button
                            onClick={() => setDetailMed(med)}
                            className="flex items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-white cursor-pointer hover:border-[#0d9488] hover:bg-[#f0fdf4] transition-all"
                            style={{ width: 34, height: 34 }}
                            title="View Details"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
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
              <p className="text-[#94a3b8] text-sm mt-1">
                {searchTerm
                  ? "No medication matches your search."
                  : activeFilter !== "all"
                  ? `No ${activeFilter} medications right now.`
                  : "No medications have been added for you yet."}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Medication details modal */}
      {detailMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailMed(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1a3c34]">{detailMed.name}</h3>
              <button onClick={() => setDetailMed(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Dosage</span><span className="font-medium text-slate-900">{detailMed.dosage || "—"}</span></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Frequency</span><span className="font-medium text-slate-900">{detailMed.frequency}</span></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Schedule</span><span className="font-medium text-slate-900 text-right">{detailMed.schedules.map((s) => s.time).join(", ")}</span></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Prescribed by</span><span className="font-medium text-slate-900">{detailMed.prescribedBy}</span></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">7-day compliance</span><span className="font-medium text-slate-900">{detailMed.compliance}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Today</span><span className="font-medium text-slate-900 capitalize">{detailMed.status}</span></div>
              {detailMed.instructions && (
                <div className="pt-2"><p className="text-slate-500 mb-1">Instructions</p><p className="font-medium text-slate-900">{detailMed.instructions}</p></div>
              )}
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => { handleMarkTaken(detailMed.id); setDetailMed(null); }} disabled={detailMed.status === "taken"} className="flex-1 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold bg-[#0d9488] text-white hover:bg-[#0f766e] disabled:opacity-50">Mark as Taken</button>
              <button onClick={() => setDetailMed(null)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold bg-white text-[#1a3c34] border-[1.5px] border-[#e2e8f0] hover:border-[#0d9488]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
