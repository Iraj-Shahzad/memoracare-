"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: string;
}

interface SystemEvent {
  id: number;
  _id?: string;
  message: string;
  time: string;
  severity: "Info" | "Warning";
}

export default function MonitoringPage() {
  const { user } = useAuth();
  void user;

  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([
    { name: "Server Uptime", value: 99.9, unit: "%", status: "healthy" },
    { name: "CPU Usage", value: 34, unit: "%", status: "healthy" },
    { name: "Memory Usage", value: 62, unit: "%", status: "warning" },
    { name: "Active Sessions", value: 23, unit: "", status: "healthy" },
  ]);

  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([
    {
      id: 1,
      message: "Server restart completed",
      time: "8:00 AM",
      severity: "Info",
    },
    {
      id: 2,
      message: "Database backup completed",
      time: "6:00 AM",
      severity: "Info",
    },
    {
      id: 3,
      message: "High memory usage detected",
      time: "Yesterday 11:30 PM",
      severity: "Warning",
    },
    {
      id: 4,
      message: "Failed login attempt from 192.168.1.45",
      time: "Yesterday 9:15 PM",
      severity: "Warning",
    },
    {
      id: 5,
      message: "Face recognition model updated",
      time: "Apr 12",
      severity: "Info",
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [healthRes, activityRes] = await Promise.all([
          apiGet("/admin/system-health").catch(() => ({})),
          apiGet("/admin/activity-log").catch(() => ({})),
        ]);

        if (healthRes.metrics || healthRes.data) {
          const metrics = healthRes.metrics || healthRes.data;
          if (Array.isArray(metrics) && metrics.length > 0) {
            setHealthMetrics(metrics);
          }
        }

        const events = activityRes.data || activityRes.events || activityRes.activities || [];
        if (Array.isArray(events) && events.length > 0) {
          setSystemEvents(events.map((e: Record<string, unknown>, idx: number) => ({
            id: idx + 1,
            _id: (e._id || "") as string,
            message: (e.message || e.action || "") as string,
            time: e.createdAt ? new Date(e.createdAt as string).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }) : (e.time as string) || "N/A",
            severity: ((e.severity || e.level || "Info") as string === "Warning" || (e.severity as string) === "warning" ? "Warning" : "Info") as SystemEvent["severity"],
          })));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load monitoring data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getMetricColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-slate-600";
    }
  };

  const getMetricStatusDot = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-slate-400";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Info":
        return "bg-blue-100 text-blue-700";
      case "Warning":
        return "bg-yellow-100 text-yellow-700";
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
          title="System Monitoring"
          subtitle="Real-time system health and performance"
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}
            {!loading && (
            <>
            {/* Health Metrics */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {healthMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg border border-slate-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-slate-600 text-sm font-medium">
                      {metric.name}
                    </p>
                    <div
                      className={`w-3 h-3 rounded-full ${getMetricStatusDot(
                        metric.status
                      )}`}
                    />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p
                      className={`text-3xl font-bold ${getMetricColor(
                        metric.status
                      )}`}
                    >
                      {metric.value}
                    </p>
                    <span className="text-slate-600 text-sm">
                      {metric.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* API Response Time */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                API Response Time
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-slate-600 text-sm font-medium mb-2">
                    Average Response Time
                  </p>
                  <p className="text-3xl font-bold text-[#0d9488]">120ms</p>
                </div>
                <div>
                  <p className="text-slate-600 text-sm font-medium mb-2">
                    Slowest Endpoint
                  </p>
                  <p className="text-3xl font-bold text-orange-600">450ms</p>
                  <p className="text-xs text-slate-500 mt-1">
                    /api/face-recognition
                  </p>
                </div>
              </div>
            </div>

            {/* Recent System Events */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Recent System Events
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Severity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {systemEvents.map((event) => (
                      <tr
                        key={event._id || event.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">
                            {event.message}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {event.time}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(
                              event.severity
                            )}`}
                          >
                            {event.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
