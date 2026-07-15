"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface LoginActivity {
  id: number;
  _id?: string;
  user: string;
  ipAddress: string;
  time: string;
  status: "Success" | "Failed";
  location: string;
}

interface Recommendation {
  id: number;
  title: string;
  description: string;
}

interface BlockedIP {
  id: number;
  ip: string;
  reason: string;
  blockedDate: string;
}

export default function SecurityPage() {
  const { user } = useAuth();
  void user;

  const [securityScore, setSecurityScore] = useState(87);
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([
    {
      id: 1,
      user: "Ahmed Khan",
      ipAddress: "192.168.1.50",
      time: "Today 2:30 PM",
      status: "Success",
      location: "Karachi, Pakistan",
    },
    {
      id: 2,
      user: "Dr. Farhan Malik",
      ipAddress: "203.92.45.120",
      time: "Today 1:15 PM",
      status: "Success",
      location: "Lahore, Pakistan",
    },
    {
      id: 3,
      user: "Sarah Khan",
      ipAddress: "192.168.1.75",
      time: "Today 12:00 PM",
      status: "Success",
      location: "Islamabad, Pakistan",
    },
    {
      id: 4,
      user: "Unknown",
      ipAddress: "203.92.45.185",
      time: "Today 10:30 AM",
      status: "Failed",
      location: "Unknown",
    },
    {
      id: 5,
      user: "Ali Raza",
      ipAddress: "192.168.1.60",
      time: "Yesterday 8:00 PM",
      status: "Success",
      location: "Peshawar, Pakistan",
    },
  ]);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([
    {
      id: 1,
      title: "Enable 2FA for all admins",
      description: "Improve security by requiring two-factor authentication",
    },
    {
      id: 2,
      title: "Update SSL certificate",
      description: "SSL certificate expires in 30 days",
    },
    {
      id: 3,
      title: "Review inactive accounts",
      description: "12 accounts have been inactive for 90+ days",
    },
  ]);

  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([
    {
      id: 1,
      ip: "203.92.45.200",
      reason: "Multiple failed login attempts",
      blockedDate: "Apr 12, 2024",
    },
    {
      id: 2,
      ip: "118.103.45.88",
      reason: "Suspicious activity detected",
      blockedDate: "Apr 10, 2024",
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await apiGet("/admin/security/login-attempts").catch(() => ({}));
        const data = res.data || res;

        if (data.securityScore != null) {
          setSecurityScore(data.securityScore);
        }

        if (data.loginAttempts || data.loginActivity) {
          const attempts = data.loginAttempts || data.loginActivity || [];
          if (Array.isArray(attempts) && attempts.length > 0) {
            setLoginActivity(attempts.map((a: Record<string, unknown>, idx: number) => ({
              id: idx + 1,
              _id: (a._id || "") as string,
              user: (a.user || a.userName || a.email || "Unknown") as string,
              ipAddress: (a.ipAddress || a.ip || "N/A") as string,
              time: a.createdAt ? new Date(a.createdAt as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : (a.time as string) || "N/A",
              status: (a.success || a.status === "Success" ? "Success" : "Failed") as LoginActivity["status"],
              location: (a.location || "Unknown") as string,
            })));
          }
        }

        if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
        }

        if (data.blockedIPs && Array.isArray(data.blockedIPs) && data.blockedIPs.length > 0) {
          setBlockedIPs(data.blockedIPs);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load security data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return "Good";
    if (score >= 60) return "Fair";
    return "Poor";
  };

  const CircleProgress = ({ percentage }: { percentage: number }) => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={
            percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444"
          }
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text
          x="60"
          y="70"
          textAnchor="middle"
          className={`text-2xl font-bold ${getScoreColor(percentage)}`}
          fill={
            percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444"
          }
        >
          {percentage}
        </text>
      </svg>
    );
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <AdminSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="Security Dashboard"
          subtitle="System security overview and recommendations"
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
            {/* Security Score */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                Security Score
              </h3>
              <div className="flex items-center gap-8">
                <div>
                  <CircleProgress percentage={securityScore} />
                </div>
                <div>
                  <p className={`text-3xl font-bold ${getScoreColor(securityScore)}`}>
                    {getScoreStatus(securityScore)}
                  </p>
                  <p className="text-slate-600 mt-2">
                    Your system has a strong security posture
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Login Activity */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Recent Login Activity
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loginActivity.map((activity) => (
                      <tr
                        key={activity._id || activity.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">
                            {activity.user}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {activity.ipAddress}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {activity.time}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                              activity.status === "Success"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {activity.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {activity.location}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Active Sessions
              </h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-[#0d9488]">23</p>
                <p className="text-slate-600">active sessions currently</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Last updated: Today 2:30 PM
              </p>
            </div>

            {/* Security Recommendations */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                Security Recommendations
              </h3>
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-yellow-100">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-4 h-4 text-yellow-600"
                      >
                        <path d="M12 9v2m0 4v2m8.228-11.566l1.414 1.414M4.358 19.358l1.414 1.414m13.858-1.414l1.414-1.414M2.944 2.944l1.414 1.414" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {rec.title}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blocked IPs */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                Blocked IPs
              </h3>
              <div className="space-y-4">
                {blockedIPs.map((ip) => (
                  <div key={ip.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {ip.ip}
                      </p>
                      <p className="text-sm text-slate-600">{ip.reason}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Blocked on {ip.blockedDate}
                      </p>
                    </div>
                    <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                      Unblock
                    </button>
                  </div>
                ))}
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
