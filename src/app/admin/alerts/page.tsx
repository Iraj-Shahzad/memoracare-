"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut, apiDelete } from "@/lib/api";

interface Alert {
  id: number;
  _id?: string;
  message: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  timestamp: string;
  status: "Active" | "Resolved";
}

export default function AlertsPage() {
  const { user } = useAuth();
  void user;

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiGet("/alerts");
      const alertsData = res.data || res.alerts || res || [];
      const mapped = Array.isArray(alertsData) ? alertsData.map((a: Record<string, unknown>, idx: number) => ({
        id: idx + 1,
        _id: (a._id || a.id || "") as string,
        message: (a.message || a.title || "") as string,
        severity: ((a.severity || a.level || "INFO") as string).toUpperCase() as Alert["severity"],
        timestamp: a.createdAt ? new Date(a.createdAt as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : (a.timestamp as string) || "N/A",
        status: (a.resolved || a.status === "Resolved" ? "Resolved" : "Active") as Alert["status"],
      })) : [];
      setAlerts(mapped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (alert: Alert) => {
    const aid = alert._id || String(alert.id);
    setActionLoading(aid);
    try {
      await apiPut(`/alerts/${aid}/resolve`, {});
      await fetchAlerts();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Failed to resolve alert");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (alert: Alert) => {
    const aid = alert._id || String(alert.id);
    if (!confirm("Are you sure you want to dismiss this alert?")) return;
    setActionLoading(aid);
    try {
      await apiDelete(`/alerts/${aid}`);
      await fetchAlerts();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Failed to dismiss alert");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAlerts =
    activeFilter === "All"
      ? alerts
      : activeFilter === "Resolved"
        ? alerts.filter((a) => a.status === "Resolved")
        : alerts.filter((a) => a.severity === activeFilter);

  const unresolvedCount = alerts.filter((a) => a.status === "Active").length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-700";
      case "WARNING":
        return "bg-yellow-100 text-yellow-700";
      case "INFO":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-red-600"
          >
            <circle cx="12" cy="12" r="10" />
            <path
              d="M12 8v4m0 4h.01"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        );
      case "WARNING":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5 text-yellow-600"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      default:
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5 text-blue-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <AdminSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="System Alerts"
          subtitle={`${unresolvedCount} unresolved alerts`}
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Filter Tabs */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-8 flex gap-2">
              {["All", "CRITICAL", "WARNING", "INFO", "Resolved"].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === filter
                        ? "bg-[#0d9488] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
            /* Alerts List */
            <div className="space-y-4">
              {filteredAlerts.map((alert) => {
                const aid = alert._id || String(alert.id);
                return (
                <div
                  key={aid}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {alert.message}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {alert.timestamp}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          alert.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {alert.status === "Active" ? "Active" : "Resolved"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 ml-9">
                    {alert.status === "Active" && (
                      <>
                        <button
                          onClick={() => handleResolve(alert)}
                          disabled={actionLoading === aid}
                          className="px-4 py-2 border border-[#0d9488] text-[#0d9488] rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading === aid ? "..." : "Resolve"}
                        </button>
                        <button
                          onClick={() => handleDismiss(alert)}
                          disabled={actionLoading === aid}
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
                );
              })}

              {filteredAlerts.length === 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                  <p className="text-slate-600 text-lg">
                    No alerts found in this category
                  </p>
                </div>
              )}
            </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
