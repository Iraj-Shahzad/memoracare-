"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface Report {
  id: number;
  _id?: string;
  title: string;
  type: "Patient Activity" | "System Usage" | "Compliance" | "Security";
  date: string;
  status: "Ready" | "Processing";
}

export default function ReportsPage() {
  const { user } = useAuth();
  void user;

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
        type: (r.type || r.category || "System Usage") as Report["type"],
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
      await apiPost("/reports/generate", { type: "System Usage" });
      await fetchReports();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (report: Report) => {
    const rid = report._id || String(report.id);
    if (!confirm(`Are you sure you want to delete "${report.title}"?`)) return;
    setActionLoading(rid);
    try {
      await apiDelete(`/reports/${rid}`);
      await fetchReports();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Failed to delete report");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports =
    activeTab === "All"
      ? reports
      : reports.filter((r) => r.type === activeTab);

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
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 border border-slate-200">
                <p className="text-slate-600 text-sm font-medium mb-2">
                  Total Reports
                </p>
                <p className="text-3xl font-bold text-[#1a3c34]">{totalReports || 45}</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-slate-200">
                <p className="text-slate-600 text-sm font-medium mb-2">
                  Pending
                </p>
                <p className="text-3xl font-bold text-[#1a3c34]">{pendingReports || 3}</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-slate-200">
                <p className="text-slate-600 text-sm font-medium mb-2">
                  Generated Today
                </p>
                <p className="text-3xl font-bold text-[#1a3c34]">{todayReports || 5}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8 flex items-center justify-between">
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

                  <div className="flex gap-3 ml-4">
                    <button className="px-4 py-2 border border-[#0d9488] text-[#0d9488] rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium">
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(report)}
                      disabled={actionLoading === rid}
                      className="px-4 py-2 bg-[#0d9488] text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === rid ? "..." : "Download"}
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
