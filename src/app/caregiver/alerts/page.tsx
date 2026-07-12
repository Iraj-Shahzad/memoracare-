"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut } from "@/lib/api";
import { useState, useEffect } from "react";

interface Alert {
  _id: string;
  severity: string;
  patientName: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const res = await apiGet("/alerts");
        const data = res.data || res.alerts || res || [];
        const list = Array.isArray(data) ? data : [];
        setAlerts(list.map((a: Record<string, unknown>) => ({
          _id: (a._id || a.id || '') as string,
          severity: (a.severity || a.type || 'info') as string,
          patientName: (a.patientName || (typeof a.patient === 'object' && a.patient !== null ? (a.patient as Record<string, unknown>).name : '') || '') as string,
          message: (a.message || '') as string,
          timestamp: (a.timestamp || a.createdAt || '') as string,
          resolved: (a.resolved || false) as boolean,
        })));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load alerts";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedFilter === "all") return true;
    return alert.severity === selectedFilter;
  });

  const unresolvedCount = alerts.filter((a) => !a.resolved).length;

  const handleResolve = async (alertId: string) => {
    try {
      await apiPut(`/alerts/${alertId}/resolve`, {});
      setAlerts(alerts.map(a => a._id === alertId ? { ...a, resolved: true } : a));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-l-4 border-red-500";
      case "warning":
        return "bg-yellow-50 border-l-4 border-yellow-500";
      case "info":
        return "bg-blue-50 border-l-4 border-blue-500";
      default:
        return "bg-slate-50 border-l-4 border-slate-500";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700";
      case "warning":
        return "bg-yellow-100 text-yellow-700";
      case "info":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case "warning":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-yellow-500">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case "info":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="Alerts & Notifications"
          subtitle="Monitor patient alerts and emergencies"
          greeting={`Good Morning, ${firstName}`}
          avatar={userInitials}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748b]">Loading alerts...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            <>
            {/* Alert Filters and Count */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                {["all", "critical", "warning", "info"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      selectedFilter === filter
                        ? "bg-[#0d9488] text-white"
                        : "bg-white text-slate-700 border border-slate-300 hover:border-[#0d9488]"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Unresolved</p>
                <p className="text-2xl font-bold text-red-600">{unresolvedCount}</p>
              </div>
            </div>

            {/* Alert List */}
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`rounded-lg border border-slate-200 p-6 ${getSeverityStyles(alert.severity)} ${alert.resolved ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 pt-0.5">
                      {getSeverityIcon(alert.severity)}
                    </div>

                    {/* Alert Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${getSeverityBadgeColor(
                                alert.severity
                              )}`}
                            >
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900">
                            {alert.patientName}
                            <span className="font-normal text-slate-600">
                              {" "}
                              {alert.message}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{alert.timestamp}</p>
                        </div>
                        {!alert.resolved && (
                        <button
                          onClick={() => handleResolve(alert._id)}
                          className="flex-shrink-0 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Mark as Resolved
                        </button>
                        )}
                        {alert.resolved && (
                          <span className="flex-shrink-0 px-4 py-2 text-green-700 text-sm font-semibold">Resolved</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <p className="text-slate-600">No alerts found.</p>
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
