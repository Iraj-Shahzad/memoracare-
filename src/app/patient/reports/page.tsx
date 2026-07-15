/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const PDFIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
    <text x="8" y="16" fontSize="6" fontWeight="bold" fill="white">PDF</text>
  </svg>
);
const ExcelIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
    <text x="7" y="16" fontSize="7" fontWeight="bold" fill="white">XLS</text>
  </svg>
);
const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface Report {
  id: string;
  title: string;
  date: string;
  type: string;
  format: string;
  status: string;
  periodFrom?: string;
  periodTo?: string;
  data?: any;
}

const FILTER_TABS = ["All", "Medication", "Routine", "Weekly Summary", "Monthly Overview"];

const titleCase = (s: string) =>
  (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const mapReport = (r: any): Report => ({
  id: r._id || r.id,
  title: r.title || "Report",
  date: r.createdAt
    ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "",
  type: r.type || "summary",
  format: (r.format || "pdf").toLowerCase(),
  status: r.status || "ready",
  periodFrom: r.period?.from,
  periodTo: r.period?.to,
  data: r.data,
});

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

export default function ReportsPage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;

  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportType, setReportType] = useState("Medication");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState("PDF");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string>("");

  const loadReports = async () => {
    if (!patientId) return;
    try {
      const res = await apiGet(`/reports/patient/${patientId}`).catch(() => null);
      if (Array.isArray(res?.reports)) {
        const mapped = res.reports.map(mapReport);
        setReports(mapped);
        setSelectedReport((prev) => mapped.find((m: Report) => m.id === prev?.id) || mapped[0] || null);
      }
    } catch (err) {
      console.error("Reports fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const filteredReports =
    activeTab === "All"
      ? reports
      : reports.filter((r) => r.type === activeTab.toLowerCase().replace(/\s+/g, "_"));

  const handleGenerateReport = async () => {
    if (!patientId) return;
    try {
      setGenerating(true);
      await apiPost("/reports/generate", {
        patientId,
        type: reportType.toLowerCase().replace(/\s+/g, "_"),
        format: format.toLowerCase(),
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      await loadReports();
    } catch (err) {
      console.error("Generate report error:", err);
    } finally {
      setGenerating(false);
      setShowGenerateModal(false);
    }
  };

  const downloadFile = async (id: string, title: string, fmt: "pdf" | "excel") => {
    try {
      setDownloadingId(id + fmt);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${API_BASE}/reports/${id}/download?format=${fmt}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "report").replace(/[^a-z0-9]+/gi, "_")}.${fmt === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      window.alert("Could not download the report. Please try again.");
    } finally {
      setDownloadingId("");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex min-h-screen bg-[#f0fdf4]">
          <PatientSidebar />
          <div className="ml-0 md:ml-[260px] flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b]">Loading reports...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const med = selectedReport?.data?.medication;
  const rtn = selectedReport?.data?.routine;

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
      <div className="flex min-h-screen bg-[#f0fdf4]">
        <PatientSidebar />

        <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
          <Topbar title="Medical Reports" subtitle="View and generate your health reports" />

          <div className="flex-1 p-6 overflow-hidden">
            <div className="flex gap-6 h-full">
              {/* Left — list */}
              <div className="w-[60%] flex flex-col">
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="mb-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0d9488] text-white rounded-lg font-semibold hover:bg-[#0d8975] transition-colors w-full"
                >
                  <PlusIcon />
                  Generate New Report
                </button>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === tab
                          ? "bg-[#0d9488] text-white"
                          : "bg-white text-[#1a3c34] border border-gray-200 hover:border-[#0d9488]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-16 text-[#64748b]">
                      <p className="font-semibold text-[#1a3c34] mb-1">No reports yet</p>
                      <p className="text-sm">Click “Generate New Report” to create one.</p>
                    </div>
                  ) : (
                    filteredReports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedReport?.id === report.id
                            ? "bg-white border-2 border-[#0d9488] shadow-md"
                            : "bg-white border border-gray-200 hover:border-[#0d9488]"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-[#1a3c34] text-sm">{report.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">Generated {report.date}</p>
                          </div>
                          <div className="text-[#0d9488]">
                            {report.format === "excel" ? <ExcelIcon /> : <PDFIcon />}
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-3">
                          <div className="flex gap-2">
                            <span className="px-2 py-1 bg-[#f0fdf4] text-[#0d9488] text-xs font-medium rounded">
                              {titleCase(report.type)}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded capitalize">
                              {report.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadFile(report.id, report.title, "pdf"); }}
                            disabled={downloadingId === report.id + "pdf"}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#0d9488] border border-[#0d9488] rounded hover:bg-[#f0fdf4] transition-colors disabled:opacity-60"
                          >
                            <DownloadIcon />
                            {downloadingId === report.id + "pdf" ? "…" : "PDF"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadFile(report.id, report.title, "excel"); }}
                            disabled={downloadingId === report.id + "excel"}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#0d9488] border border-[#0d9488] rounded hover:bg-[#f0fdf4] transition-colors disabled:opacity-60"
                          >
                            <ExcelIcon />
                            {downloadingId === report.id + "excel" ? "…" : "Excel"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right — preview */}
              <div className="w-[40%] bg-white rounded-lg border border-gray-200 p-6 flex flex-col overflow-y-auto">
                {!selectedReport ? (
                  <div className="flex-1 flex items-center justify-center text-center text-[#64748b]">
                    <p>Select a report to preview it here.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-[#1a3c34] mb-1">{selectedReport.title}</h2>
                    <p className="text-sm text-gray-500 mb-6 capitalize">
                      {titleCase(selectedReport.type)} · {selectedReport.format.toUpperCase()}
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="p-4 bg-[#f0fdf4] rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Period</p>
                        <p className="font-semibold text-[#1a3c34] text-xs">
                          {fmtDate(selectedReport.periodFrom)} – {fmtDate(selectedReport.periodTo)}
                        </p>
                      </div>
                      <div className="p-4 bg-[#f0fdf4] rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Total Entries</p>
                        <p className="font-semibold text-[#1a3c34] text-sm">
                          {(med?.total || 0) + (rtn?.total || 0)}
                        </p>
                      </div>
                      <div className="p-4 bg-[#f0fdf4] rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Compliance</p>
                        <p className="font-semibold text-[#0d9488] text-sm">
                          {med ? `${med.complianceRate}%` : rtn ? `${rtn.completionRate}%` : "—"}
                        </p>
                      </div>
                    </div>

                    {med && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-[#1a3c34] mb-3 text-sm">Medication</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Total scheduled" value={med.total} />
                          <Row label="Taken" value={med.taken} valueClass="text-green-600" />
                          <Row label="Missed" value={med.missed} valueClass="text-red-500" />
                          <Row label="Compliance rate" value={`${med.complianceRate}%`} valueClass="text-[#0d9488] font-bold" />
                        </div>
                      </div>
                    )}

                    {rtn && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-[#1a3c34] mb-3 text-sm">Routine</h3>
                        <div className="space-y-2 text-sm">
                          <Row label="Total scheduled" value={rtn.total} />
                          <Row label="Completed" value={rtn.completed} valueClass="text-green-600" />
                          <Row label="Missed" value={rtn.missed} valueClass="text-red-500" />
                          <Row label="Completion rate" value={`${rtn.completionRate}%`} valueClass="text-[#0d9488] font-bold" />
                        </div>
                      </div>
                    )}

                    {!med && !rtn && (
                      <p className="text-sm text-[#64748b] mb-6">
                        This report has no summary data. Download it for full details.
                      </p>
                    )}

                    <div className="flex gap-3 mt-auto pt-6 border-t border-gray-200">
                      <button
                        onClick={() => downloadFile(selectedReport.id, selectedReport.title, "pdf")}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0d9488] text-white rounded-lg font-semibold hover:bg-[#0d8975] transition-colors"
                      >
                        <DownloadIcon />
                        Download PDF
                      </button>
                      <button
                        onClick={() => downloadFile(selectedReport.id, selectedReport.title, "excel")}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-[#0d9488] text-[#0d9488] rounded-lg font-semibold hover:bg-[#f0fdf4] transition-colors"
                      >
                        <ExcelIcon />
                        Export Excel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Report Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-96 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#1a3c34]">Generate New Report</h2>
                <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <CloseIcon />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[#1a3c34] mb-2">Report Type</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[#1a3c34] focus:outline-none focus:border-[#0d9488]"
                  >
                    <option>Medication</option>
                    <option>Routine</option>
                    <option>Weekly Summary</option>
                    <option>Monthly Overview</option>
                    <option>Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1a3c34] mb-2">From Date</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[#1a3c34] focus:outline-none focus:border-[#0d9488]" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1a3c34] mb-2">To Date</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[#1a3c34] focus:outline-none focus:border-[#0d9488]" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1a3c34] mb-3">Format</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value="PDF" checked={format === "PDF"} onChange={(e) => setFormat(e.target.value)} className="w-4 h-4 accent-[#0d9488]" />
                      <span className="text-sm text-[#1a3c34]">PDF</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value="Excel" checked={format === "Excel"} onChange={(e) => setFormat(e.target.value)} className="w-4 h-4 accent-[#0d9488]" />
                      <span className="text-sm text-[#1a3c34]">Excel</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowGenerateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-[#1a3c34] rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleGenerateReport} disabled={generating}
                    className="flex-1 px-4 py-2 bg-[#0d9488] text-white rounded-lg font-semibold hover:bg-[#0d8975] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {generating ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: any; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold text-[#1a3c34] ${valueClass}`}>{value}</span>
    </div>
  );
}
