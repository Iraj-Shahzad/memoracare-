"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut, apiDelete } from "@/lib/api";

interface User {
  id: number;
  _id?: string;
  name: string;
  email: string;
  role: "Patient" | "Caregiver" | "Admin" | "patient" | "caregiver" | "admin";
  status: "Active" | "Inactive" | "active" | "inactive";
  registrationDate: string;
  lastActive: string;
  createdAt?: string;
  lastLogin?: string;
  isActive?: boolean;
}

export default function UsersPage() {
  const { user: authUser } = useAuth();
  void authUser;

  const [filterRole, setFilterRole] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiGet("/users");
      const usersData = res.data || res.users || res || [];
      const mapped = Array.isArray(usersData) ? usersData.map((u: Record<string, unknown>, idx: number) => ({
        id: idx + 1,
        _id: (u._id || u.id || "") as string,
        name: (u.name || "") as string,
        email: (u.email || "") as string,
        role: (u.role || "Patient") as User["role"],
        status: (u.isActive === false ? "Inactive" : u.status || "Active") as User["status"],
        registrationDate: u.createdAt ? new Date(u.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
        lastActive: u.lastLogin ? new Date(u.lastLogin as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
        isActive: u.isActive as boolean | undefined,
      })) : [];
      setUsers(mapped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (u: User) => {
    const uid = u._id || String(u.id);
    setActionLoading(uid);
    try {
      const newStatus = u.status === "Active" || u.status === "active" ? false : true;
      await apiPut(`/users/${uid}`, { isActive: newStatus });
      await fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (u: User) => {
    const uid = u._id || String(u.id);
    if (!confirm(`Are you sure you want to delete ${u.name}?`)) return;
    setActionLoading(uid);
    try {
      await apiDelete(`/users/${uid}`);
      await fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  const normalizeRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  const normalizeStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  const filteredUsers = users.filter((user) => {
    const matchesRole = filterRole === "All" || normalizeRole(user.role) === filterRole;
    const matchesStatus = filterStatus === "All" || normalizeStatus(user.status) === filterStatus;
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (normalizeRole(role)) {
      case "Patient":
        return "bg-blue-100 text-blue-700";
      case "Caregiver":
        return "bg-green-100 text-green-700";
      case "Admin":
        return "bg-purple-100 text-purple-700";
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
          title="User Management"
          subtitle="Manage platform users and their roles"
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Controls */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Role
                  </label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  >
                    <option>All</option>
                    <option>Patient</option>
                    <option>Caregiver</option>
                    <option>Admin</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  >
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button className="px-6 py-2 bg-[#0d9488] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors">
                    Add User
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
            /* Users Table */
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((user) => {
                      const uid = user._id || String(user.id);
                      const isActive = normalizeStatus(user.status) === "Active";
                      return (
                      <tr key={uid} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">
                            {user.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">{user.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {normalizeRole(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isActive
                                  ? "bg-green-500"
                                  : "bg-slate-400"
                              }`}
                            />
                            <span className="text-sm text-slate-600">
                              {normalizeStatus(user.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {user.registrationDate}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {user.lastActive}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={actionLoading === uid}
                              className="text-xs px-3 py-1 text-[#0d9488] hover:bg-teal-50 rounded transition-colors disabled:opacity-50"
                            >
                              {actionLoading === uid ? "..." : isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={actionLoading === uid}
                              className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Showing {filteredUsers.length} of {users.length} users
                </span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border border-slate-300 rounded text-sm hover:bg-slate-50">
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-[#0d9488] text-white rounded text-sm">
                    1
                  </button>
                  <button className="px-3 py-1 border border-slate-300 rounded text-sm hover:bg-slate-50">
                    Next
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
