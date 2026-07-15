"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import { useState, useEffect } from "react";

interface Patient {
  _id: string;
  name: string;
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [reportCards, setReportCards] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await apiGet("/caregiver/my-patients");
        const data = res.data || res.patients || res || [];
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((p: Record<string, unknown>) => ({ _id: (p._id || p.id) as string, name: p.name as string }));
        setPatients(mapped);
        if (mapped.length > 0) {
          setSelectedPatientId(mapped[0]._id);
        }
      } catch {
        // patients remain empty
      }
    };
    fetchPatients();
  }, []);

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiGet("/reports");
        const data = res.data || res.reports || res || [];
        const list = Array.isArray(data) ? data : [];
        setReportCards(list.map((r: Record<string, unknown>) => ({
          _id: (r._id || r.id || '') as string,
          title: (r.title || r.name || '') as string,
          dateRange: (r.dateRange || r.date || '') as string,
          type: (r.type || 'Overview') as string,
          description: (r.description || '') as string,
        })));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load reports";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleGenerateReport = async (type: string) => {
    if (!selectedPatientId) return;
    try {
      setGenerating(true);
      await apiPost("/reports/generate", { patient: selectedPatientId, type });
      // Re-fetch reports
      const res = await apiGet("/reports");
      const data = res.data || res.reports || res || [];
      const list = Array.isArray(data) ? data : [];
      setReportCards(list.map((r: Record<string, unknown>) => ({
        _id: (r._id || r.id || '') as string,
        title: (r.title || r.name || '') as string,
        dateRange: (r.dateRange || r.date || '') as string,
        type: (r.type || 'Overview') as string,
        description: (r.description || '') as string,
      })));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  const stats = [
    { label: "Reports Generated", value: String(reportCards.length) },
    { label: "Average Compliance", value: "N/A" },
    { label: "Active Patients", value: String(patients.length) },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Medication":
        return "bg-blue-100 text-blue-700";
      case "Routine":
        return "bg-green-100 text-green-700";
      case "Overview":
        return "bg-purple-100 text-purple-700";
      case "Analytics":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="Reports"
          subtitle="Generate and download patient reports"
          greeting={`Good Morning, ${firstName}`}
          avatar={userInitials}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Patient Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
              >
                {patients.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Generate Report Button */}
            <div className="mb-8 flex gap-3">
              <button
                onClick={() => handleGenerateReport("medication")}
                disabled={generating}
                className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate Medication Report"}
              </button>
              <button
                onClick={() => handleGenerateReport("routine")}
                disabled={generating}
                className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors disabled:opacity-50"
              >
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
                <button onClick={() => window.location.reload()} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            <>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 border border-slate-200">
                  <p className="text-slate-600 text-sm font-medium mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-[#1a3c34]">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-2 gap-6">
              {reportCards.map((report) => (
                <div
                  key={report._id}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1a3c34] mb-2">{report.title}</h3>
                      <p className="text-sm text-slate-600 mb-3">{report.description}</p>
                      <p className="text-xs text-slate-500 mb-4">{report.dateRange}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${getTypeColor(
                      report.type
                    )}`}>
                      {report.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <button className="flex-1 px-4 py-2 border border-[#0d9488] text-[#0d9488] rounded-lg text-sm font-semibold hover:bg-[#f0fdf4] transition-colors flex items-center justify-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-4 h-4"
                      >
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      PDF
                    </button>
                    <button className="flex-1 px-4 py-2 border border-[#0d9488] text-[#0d9488] rounded-lg text-sm font-semibold hover:bg-[#f0fdf4] transition-colors flex items-center justify-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-4 h-4"
                      >
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Excel
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
            )}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
