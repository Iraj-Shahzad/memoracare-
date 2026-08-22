"use client";

/**
 * ADMIN REPORTS — list, generate, view, download and delete system reports.
 *
 * Key concepts: ProtectedRoute allowedRoles={["admin"]}. fetchReports() maps GET /reports
 * into a display shape. Generate = POST /reports/generate { type: "system" } then re-fetch.
 * IMPORTANT distinction between the two look-alike buttons: View fetches the PDF as an
 * authenticated blob (manual fetch with the Bearer token from localStorage, then
 * URL.createObjectURL + window.open, revoked after 60s) because a plain <a> link can't
 * send the auth header; Download uses apiDownload() to save the same authenticated PDF;
 * Delete = DELETE /reports/:id behind a confirm() dialog. Tabs filter by KEYWORD match
 * (TAB_KEYWORDS) since UI labels don't map 1:1 to backend type strings. Quick-stat tiles
 * (total/pending/today) are derived from the fetched list, not separate calls.
 * Viva line: "View and Download both stream an authenticated PDF blob with the JWT attached — Download saves the file and does NOT delete it; delete is a separate guarded DELETE".
 */

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/components/ui/UIProvider";
import { apiGet, apiPost, apiDelete, apiDownload } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const safeName = (t: string) => (t || "report").replace(/[^a-z0-9]+/gi, "_");

interface Report {
  id: number;
  _id?: string;
  title: string;
  type: "Patient Activity" | "System Usage" | "Compliance" | "Security";
  date: string;
  status: "Ready" | "Processing";
}

// Map raw backend report-type enums to the friendly labels the badge styles.
const TYPE_LABELS: Record<string, Report["type"]> = {
  system: "System Usage",
  usage: "System Usage",
  patient: "Patient Activity",
  activity: "Patient Activity",
  compliance: "Compliance",
  security: "Security",
};

export default function ReportsPage() {
  const { user } = useAuth();
  void user;
  const { toast, confirm } = useUI();

  const [activeTab, setActiveTab] = useState<string>("All");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await apiGet("/reports");
      const reportsData = res.data || res.reports || res || [];
      const mapped = Array.isArray(reportsData) ? reportsData.map((r: Record<string, unknown>, idx: number) => ({
        id: idx + 1,
        _id: (r._id || r.id || "") as string,
        title: (r.title || r.name || "") as string,
        // Map raw backend type enums to the friendly labels the badge styles.
        type: (TYPE_LABELS[String(r.type || r.category || "")] || r.type || "System Usage") as Report["type"],
        date: r.createdAt ? new Date(r.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : (r.date as string) || "N/A",
        status: (r.status === "Processing" || r.status === "processing" ? "Processing" : "Ready") as Report["status"],
      })) : [];
      setReports(mapped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiPost("/reports/generate", { type: "system" });
      await fetchReports();
      toast("System report generated.", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to generate report", "error");
    } finally {
      setGenerating(false);
    }
  };

  // View: open the report PDF inline in a new tab (needs the auth token, so we
  // fetch the blob rather than a plain link).
  const handleView = async (report: Report) => {
    const rid = report._id || String(report.id);
    setActionLoading(rid + "view");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${API_BASE}/reports/${rid}/download?format=pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("Could not open the report");
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Could not open the report", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Download: save the report PDF (was mistakenly wired to delete!).
  const handleDownload = async (report: Report) => {
    const rid = report._id || String(report.id);
    setActionLoading(rid);
    try {
      await apiDownload(`/reports/${rid}/download?format=pdf`, `${safeName(report.title)}.pdf`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Could not download the report", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (report: Report) => {
    const rid = report._id || String(report.id);
    if (!(await confirm({ message: `Are you sure you want to delete "${report.title}"?`, danger: true, confirmText: "Delete" }))) return;
    setActionLoading(rid);
    try {
      await apiDelete(`/reports/${rid}`);
      await fetchReports();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to delete report", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Tab labels don't map 1:1 to backend report types (e.g. type "system" /
  // "medication" / "routine"), so match by keyword instead of exact string.
  const TAB_KEYWORDS: Record<string, string[]> = {
    "Patient Activity": ["patient", "activity", "medication", "routine"],
    "System Usage": ["system", "usage", "overview"],
    Compliance: ["compliance"],
    Security: ["security"],
  };
  const filteredReports =
    activeTab === "All"
      ? reports
      : reports.filter((r) => {
          const hay = `${r.type} ${r.title}`.toLowerCase();
          return (TAB_KEYWORDS[activeTab] || [activeTab.toLowerCase()]).some((k) => hay.includes(k));
        });

  const totalReports = reports.length;
  const pendingReports = reports.filter(r => r.status === "Processing").length;
  const todayReports = reports.filter(r => {
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return r.date === today;
  }).length;

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Patient Activity":
        return "bg-blue-100 text-blue-700";
      case "System Usage":
        return "bg-green-100 text-green-700";
      case "Compliance":
        return "bg-orange-100 text-orange-700";
      case "Security":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <AdminSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="System Reports"
          subtitle="View and generate system reports"
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 border border-slate-200">
                <p className="text-slate-600 text-sm font-medium mb-2">
                  Total Reports
                </p>
                <p className="text-3xl font-bold text-[#1a3c34]">{totalReports}</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-slate-200">
                <p className="text-slate-600 text-sm font-medium mb-2">
                  Pending
                </p>
                <p className="text-3xl font-bold text-[#1a3c34]">{pendingReports}</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-slate-200">
                <p className="text-slate-600 text-sm font-medium mb-2">
                  Generated Today
                </p>
                <p className="text-3xl font-bold text-[#1a3c34]">{todayReports}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-4">
                {[
                  "All",
                  "Patient Activity",
                  "System Usage",
                  "Compliance",
                  "Security",
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "bg-[#0d9488] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-6 py-2 bg-[#0d9488] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate System Report"}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 py-12 text-center text-sm text-slate-500">
                No reports found. Use “Generate System Report” above to create one.
              </div>
            ) : (
            /* Reports List */
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const rid = report._id || String(report.id);
                return (
                <div
                  key={rid}
                  className="bg-white rounded-lg border border-slate-200 p-6 flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {report.title}
                      </h3>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(
                          report.type
                        )}`}
                      >
                        {report.type}
                      </span>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          report.status === "Ready"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{report.date}</p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleView(report)}
                      disabled={actionLoading === rid + "view"}
                      className="px-4 py-2 border border-[#0d9488] text-[#0d9488] rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === rid + "view" ? "..." : "View"}
                    </button>
                    <button
                      onClick={() => handleDownload(report)}
                      disabled={actionLoading === rid}
                      className="px-4 py-2 bg-[#0d9488] text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === rid ? "..." : "Download"}
                    </button>
                    <button
                      onClick={() => handleDelete(report)}
                      disabled={actionLoading === rid || actionLoading === rid + "view"}
                      title="Delete report"
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
