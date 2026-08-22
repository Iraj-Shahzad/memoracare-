"use client";

/**
 * ADMIN USERS — full user-management table (list, create, activate/deactivate, delete).
 *
 * Key concepts: ProtectedRoute allowedRoles={["admin"]}. fetchUsers() calls GET /users
 * and maps the raw backend docs into a display shape (deriving status from isActive,
 * formatting createdAt/lastLogin). Add-User modal validates name/email/password client-
 * side then POST /users (createUser) and re-fetches. Row actions hit real endpoints:
 * activate/deactivate = PUT /users/:id { isActive }, delete = DELETE /users/:id (guarded
 * by a confirm() dialog). Filtering (role/status/search) and pagination are CLIENT-side
 * over the fetched list (PAGE_SIZE 10); a useEffect resets to page 1 when filters change
 * so we never land on an empty page. actionLoading tracks the per-row in-flight button.
 * Viva line: "This page is real CRUD over the /users API — create, toggle active state, and delete all persist to the backend and the table re-fetches".
 */

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/shared/AdminSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/components/ui/UIProvider";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

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
  const { toast, confirm } = useUI();

  const [filterRole, setFilterRole] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pagination (client-side, 10 per page)
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Add-user modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", phone: "", role: "patient" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const handleCreateUser = async () => {
    setAddError("");
    // Validation
    if (addForm.name.trim().length < 2) { setAddError("Please enter the person's full name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) { setAddError("Please enter a valid email address."); return; }
    if (addForm.password.length < 6) { setAddError("Password must be at least 6 characters."); return; }
    try {
      setAddSaving(true);
      await apiPost("/users", {
        name: addForm.name.trim(),
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        phone: addForm.phone.trim(),
        role: addForm.role,
      });
      setShowAdd(false);
      setAddForm({ name: "", email: "", password: "", phone: "", role: "patient" });
      toast("User created successfully.", "success");
      await fetchUsers();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Could not create the user.");
    } finally {
      setAddSaving(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Pull a high limit so client-side search/filter/pagination see all users
      // (the API defaults to 20, which would hide user #21+).
      const res = await apiGet("/users?limit=1000");
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
      toast(err instanceof Error ? err.message : "Failed to update user", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (u: User) => {
    const uid = u._id || String(u.id);
    if (!(await confirm({ message: `Are you sure you want to delete ${u.name}?`, danger: true, confirmText: "Delete" }))) return;
    setActionLoading(uid);
    try {
      await apiDelete(`/users/${uid}`);
      await fetchUsers();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to delete user", "error");
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

  // Reset to page 1 whenever the filters/search change so we never land on an empty page.
  useEffect(() => { setCurrentPage(1); }, [filterRole, filterStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

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
                  <button
                    onClick={() => { setAddForm({ name: "", email: "", password: "", phone: "", role: "patient" }); setAddError(""); setShowAdd(true); }}
                    className="px-6 py-2 bg-[#0d9488] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
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
                    {paginatedUsers.map((user) => {
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
                  {filteredUsers.length === 0
                    ? "No users match your filters"
                    : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filteredUsers.length)} of ${filteredUsers.length}`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-slate-300 rounded text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 bg-[#0d9488] text-white rounded text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 border border-slate-300 rounded text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        </main>
      </div>

      {/* Add User modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !addSaving && setShowAdd(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1a3c34]">Add a new user</h3>
              <button onClick={() => !addSaving && setShowAdd(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>

            {addError && (
              <div className="mb-3 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]" placeholder="e.g. Ali Raza" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]" placeholder="name@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]" placeholder="min 6 characters" />
                <p className="text-xs text-slate-500 mt-1">Set an initial password and share it with the user; they can change it later in Settings.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]" placeholder="+92 300 1234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]">
                    <option value="patient">Patient</option>
                    <option value="caregiver">Caregiver</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} disabled={addSaving}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleCreateUser} disabled={addSaving}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#0d9488] text-white hover:bg-teal-700 disabled:opacity-50">
                {addSaving ? "Creating…" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
