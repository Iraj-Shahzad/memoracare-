"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { timeGreeting } from "@/lib/greeting";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDownload, apiDelete } from "@/lib/api";
import { useUI } from "@/components/ui/UIProvider";
import { useState, useEffect } from "react";

interface Patient {
  _id: string;
  name: string;
  compliance: number;
}

interface Report {
  _id: string;
  title: string;
  dateRange: string;
  type: string;
  description: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [reportCards, setReportCards] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  // Track which report+format combos were already downloaded this session,
  // so we can warn before downloading the same file again.
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  const fmtRange = (r: Record<string, unknown>) => {
    const p = (r.period || {}) as { from?: string; to?: string };
    if (!p.from && !p.to) return "";
    const f = p.from ? new Date(p.from).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
    const t = p.to ? new Date(p.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
    return `${f} – ${t}`;
  };

  const mapReports = (list: Record<string, unknown>[]): Report[] =>
    list.map((r) => {
      const type = (r.type || "overview") as string;
      const desc =
        type === "medication" ? "Medication adherence summary for the period."
        : type === "routine" ? "Daily routine completion summary for the period."
        : "Care overview for the period.";
      return {
        _id: (r._id || r.id || "") as string,
        title: (r.title || r.name || "") as string,
        dateRange: fmtRange(r),
        type,
        description: (r.description as string) || desc,
      };
    });

  // Fetch patients (with real compliance for the Average Compliance stat)
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await apiGet("/caregiver/my-patients");
        const data = res.data || res.patients || res || [];
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((p: Record<string, unknown>) => ({
          _id: (p._id || p.id) as string,
          name: p.name as string,
          compliance: (p.compliance as number) ?? 0,
        }));
        setPatients(mapped);
        if (mapped.length > 0) setSelectedPatientId(mapped[0]._id);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const loadReports = async (patientId: string, silent = false) => {
    if (!patientId) return;
    try {
      if (!silent) { setLoading(true); setError(""); }
      const res = await apiGet(`/reports/patient/${patientId}`);
      const data = res.data || res.reports || res || [];
      setReportCards(mapReports(Array.isArray(data) ? data : []));
    } catch (err: unknown) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Reports are scoped to the selected patient only.
  useEffect(() => {
    if (selectedPatientId) loadReports(selectedPatientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  const handleGenerateReport = async (type: string) => {
    if (!selectedPatientId) return;
    // Prevent silently piling up duplicates: if a report of this type already
    // exists for this patient (same period), confirm before generating another.
    const alreadyExists = reportCards.some((r) => r.type.toLowerCase() === type.toLowerCase());
    if (alreadyExists) {
      const ok = await confirm({
        message: `A ${type} report for this patient already exists for this period. It would be the same report for the same date range — generate another copy anyway?`,
      });
      if (!ok) return;
    }
    try {
      setGenerating(true);
      await apiPost("/reports/generate", { patientId: selectedPatientId, type });
      await loadReports(selectedPatientId, true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to generate report", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!(await confirm({ message: `Delete "${report.title}"? This removes the report permanently.`, danger: true, confirmText: "Delete" }))) return;
    try {
      await apiDelete(`/reports/${report._id}`);
      await loadReports(selectedPatientId, true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to delete report", "error");
    }
  };

  const handleDownload = async (report: Report, format: "pdf" | "excel") => {
    const key = `${report._id}:${format}`;
    if (downloaded.has(key)) {
      if (!(await confirm({ message: `You already downloaded this ${format.toUpperCase()} file. Download it again?` }))) return;
    }
    try {
      const ext = format === "excel" ? "xlsx" : "pdf";
      const safe = report.title.replace(/[^a-z0-9]+/gi, "_");
      await apiDownload(`/reports/${report._id}/download?format=${format}`, `${safe}.${ext}`);
      setDownloaded((prev) => new Set(prev).add(key));
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Download failed", "error");
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  const avgCompliance = patients.length
    ? Math.round(patients.reduce((s, p) => s + (p.compliance || 0), 0) / patients.length)
    : 0;

  const stats = [
    { label: "Reports (this patient)", value: String(reportCards.length) },
    { label: "Average Compliance", value: patients.length ? `${avgCompliance}%` : "N/A" },
    { label: "Active Patients", value: String(patients.length) },
  ];

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "medication": return "bg-blue-100 text-blue-700";
      case "routine": return "bg-green-100 text-green-700";
      case "overview": return "bg-purple-100 text-purple-700";
      case "analytics": return "bg-orange-100 text-orange-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="Reports"
          subtitle="Generate and download patient reports"
          greeting={timeGreeting(firstName)}
          avatar={userInitials}
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Patient Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Patient</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
              >
                {patients.length === 0 && <option value="">No patients yet</option>}
                {patients.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>

            {/* Generate Report Buttons */}
            <div className="mb-8 flex flex-wrap gap-3">
              <button onClick={() => handleGenerateReport("medication")} disabled={generating || !selectedPatientId} className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors disabled:opacity-50">
                {generating ? "Generating..." : "Generate Medication Report"}
              </button>
              <button onClick={() => handleGenerateReport("routine")} disabled={generating || !selectedPatientId} className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors disabled:opacity-50">
                {generating ? "Generating..." : "Generate Routine Report"}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748b]">Loading reports...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={() => loadReports(selectedPatientId)} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 border border-slate-200">
                  <p className="text-slate-600 text-sm font-medium mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-[#1a3c34]">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Report Cards — only for the selected patient */}
            {reportCards.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                <p className="text-slate-600">No reports yet for this patient. Use the buttons above to generate one.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reportCards.map((report) => (
                <div key={report._id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1a3c34] mb-2">{report.title}</h3>
                      <p className="text-sm text-slate-600 mb-3">{report.description}</p>
                      {report.dateRange && <p className="text-xs text-slate-500 mb-4">{report.dateRange}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                      <button onClick={() => handleDeleteReport(report)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Delete</button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <button onClick={() => handleDownload(report, "pdf")} className="flex-1 px-4 py-2 border border-[#0d9488] text-[#0d9488] rounded-lg text-sm font-semibold hover:bg-[#f0fdf4] transition-colors flex items-center justify-center gap-2">
                      <DownloadIcon /> PDF
                    </button>
                    <button onClick={() => handleDownload(report, "excel")} className="flex-1 px-4 py-2 border border-[#0d9488] text-[#0d9488] rounded-lg text-sm font-semibold hover:bg-[#f0fdf4] transition-colors flex items-center justify-center gap-2">
                      <DownloadIcon /> Excel
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
            </>
            )}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
