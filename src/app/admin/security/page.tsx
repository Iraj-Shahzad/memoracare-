"use client";

/**
 * ADMIN SECURITY — live account-security overview.
 * Trimmed to REAL data only: account counts, role breakdown, active vs
 * deactivated, admin count, and the most recently registered accounts — all
 * computed from the real /users list. Detailed login-attempt logging and IP
 * blocking are NOT part of this build, so we state that honestly instead of
 * showing placeholder metrics.
 */

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

interface AdminUser {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
}

export default function SecurityPage() {
  const { user } = useAuth();
  void user;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await apiGet("/users");
        const list = res.data || res.users || res || [];
        setUsers(Array.isArray(list) ? list : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load account data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const roleOf = (r?: string) => (r || "patient").toLowerCase();
  const total = users.length;
  const active = users.filter((u) => u.isActive !== false).length;
  const inactive = total - active;
  const admins = users.filter((u) => roleOf(u.role) === "admin").length;
  const patients = users.filter((u) => roleOf(u.role) === "patient").length;
  const caregivers = users.filter((u) => roleOf(u.role) === "caregiver").length;

  const recent = [...users]
    .filter((u) => u.createdAt)
    .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
    .slice(0, 8);

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const roleBadge = (role?: string) => {
    switch (roleOf(role)) {
      case "patient": return "bg-blue-100 text-blue-700";
      case "caregiver": return "bg-green-100 text-green-700";
      case "admin": return "bg-purple-100 text-purple-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const StatCard = ({ label, value, accent = "#0d9488" }: { label: string; value: number; accent?: string }) => (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="text-3xl font-extrabold" style={{ color: accent }}>{value}</div>
      <div className="text-sm text-slate-600 mt-1">{label}</div>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex min-h-screen bg-[#f0fdf4]">
        <AdminSidebar />

        <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
          <Topbar title="Account Security" subtitle="Live overview of platform accounts" showSOS={false} />

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

              {!loading && !error && (
                <>
                  {/* Account overview (real) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Total Accounts" value={total} />
                    <StatCard label="Active" value={active} accent="#16a34a" />
                    <StatCard label="Deactivated" value={inactive} accent="#dc2626" />
                    <StatCard label="Admin Accounts" value={admins} accent="#7c3aed" />
                  </div>

                  {/* Role breakdown (real) */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Accounts by Role</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-blue-50">
                        <div className="text-2xl font-bold text-blue-700">{patients}</div>
                        <div className="text-sm text-slate-600 mt-1">Patients</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-green-50">
                        <div className="text-2xl font-bold text-green-700">{caregivers}</div>
                        <div className="text-sm text-slate-600 mt-1">Caregivers</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-purple-50">
                        <div className="text-2xl font-bold text-purple-700">{admins}</div>
                        <div className="text-sm text-slate-600 mt-1">Admins</div>
                      </div>
                    </div>
                  </div>

                  {/* Recently registered accounts (real) */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-slate-200">
                      <h3 className="text-lg font-semibold text-slate-900">Recently Registered Accounts</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Registered</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {recent.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">No accounts yet.</td></tr>
                          ) : recent.map((u, i) => (
                            <tr key={u._id || i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">{u.name || "—"}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{u.email || "—"}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${roleBadge(u.role)}`}>
                                  {roleOf(u.role).charAt(0).toUpperCase() + roleOf(u.role).slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{fmtDate(u.createdAt)}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${u.isActive !== false ? "bg-green-500" : "bg-slate-400"}`} />
                                  <span className="text-sm text-slate-600">{u.isActive !== false ? "Active" : "Inactive"}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Honest note about what is / isn't tracked */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="w-5 h-5 flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p className="text-sm text-slate-600">
                      This overview reflects live account data. Detailed login-attempt logging and IP blocking are
                      not enabled in this build. Passwords are stored as bcrypt hashes and all API routes are
                      protected by JWT authentication with role-based access control.
                    </p>
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
