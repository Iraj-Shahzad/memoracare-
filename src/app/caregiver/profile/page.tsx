"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { timeGreeting } from "@/lib/greeting";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut } from "@/lib/api";
import { useState, useEffect } from "react";

interface ProfileInfo {
  name: string;
  role: string;
  phone: string;
  email: string;
  specialization: string;
  notes: string;
}

interface AssignedPatient {
  _id: string;
  name: string;
  diagnosis: string;
  age: number;
  initials: string;
  color: string;
}

interface Overview {
  patient: { diagnosis?: string; gender?: string; city?: string; doctor?: string; user?: { name?: string; email?: string; phone?: string } };
  medications: { total: number };
  routines: { total: number };
  alerts: Array<{ _id: string; message?: string; createdAt?: string }>;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profileInfo, setProfileInfo] = useState<ProfileInfo>({
    name: "", role: "Caregiver", phone: "", email: "", specialization: "", notes: "",
  });
  const [assignedPatients, setAssignedPatients] = useState<AssignedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", specialization: "", notes: "" });

  // View patient modal
  const [showView, setShowView] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewName, setOverviewName] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await apiGet("/caregiver/profile");
      const p = res.profile || res;
      setProfileInfo({
        name: p.name || "", role: p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : "Caregiver",
        phone: p.phone || "", email: p.email || "",
        specialization: p.specialization || "", notes: p.notes || "",
      });
    } catch {
      // fall back to auth user for name/email/phone
      if (user) setProfileInfo((prev) => ({ ...prev, name: user.name || "", email: user.email || "", phone: user.phone || "" }));
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadProfile();
      try {
        const res = await apiGet("/caregiver/my-patients");
        const data = res.data || res.patients || res || [];
        const list = Array.isArray(data) ? data : [];
        setAssignedPatients(list.map((p: Record<string, unknown>) => ({
          _id: (p._id || p.id || "") as string,
          name: (p.name || "") as string,
          diagnosis: (p.diagnosis || "") as string,
          age: (p.age || 0) as number,
          initials: (p.initials || (p.name as string)?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "") as string,
          color: (p.color as string) || "#0d9488",
        })));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load patients");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = () => {
    setForm({ name: profileInfo.name, phone: profileInfo.phone, specialization: profileInfo.specialization, notes: profileInfo.notes });
    setFormError("");
    setShowEdit(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (form.name.trim().length < 3) { setFormError("Name must be at least 3 characters."); return; }
    try {
      setSaving(true);
      await apiPut("/caregiver/profile", {
        name: form.name.trim(), phone: form.phone.trim(),
        specialization: form.specialization.trim(), notes: form.notes.trim(),
      });
      setShowEdit(false);
      await loadProfile();
      await refreshUser(); // keep the Topbar/greeting name in sync
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const openView = async (patient: AssignedPatient) => {
    setOverviewName(patient.name);
    setShowView(true);
    setOverview(null);
    try {
      setOverviewLoading(true);
      const res = await apiGet(`/caregiver/patients/${patient._id}/overview`);
      setOverview(res.overview || res.data || res);
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="My Profile"
          subtitle="Manage your caregiver information"
          greeting={timeGreeting(firstName)}
          avatar={userInitials}
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748b]">Loading profile...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            <>
            {/* Profile Header */}
            <div className="bg-white rounded-lg border border-slate-200 p-8 mb-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-[#0d9488] rounded-2xl flex items-center justify-center text-white font-bold text-3xl">
                  {userInitials}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#1a3c34] mb-1">{profileInfo.name}</h1>
                  <p className="text-lg text-slate-600">{profileInfo.role}</p>
                  {profileInfo.specialization && <p className="text-sm text-slate-500 mt-1">{profileInfo.specialization}</p>}
                </div>
              </div>
            </div>

            {/* Profile Information — single merged card */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[#1a3c34]">Profile Information</h3>
                <button onClick={openEdit} className="px-5 py-2 text-sm font-semibold text-[#0d9488] border border-[#0d9488] rounded-lg hover:bg-[#f0fdf4] transition-colors">Edit</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <div><p className="text-xs text-slate-500 mb-1">Full Name</p><p className="text-sm font-medium text-slate-900">{profileInfo.name}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">Phone Number</p><p className="text-sm font-medium text-slate-900">{profileInfo.phone || "Not set"}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">Email Address</p><p className="text-sm font-medium text-slate-900 break-all">{profileInfo.email}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">Role</p><p className="text-sm font-medium text-slate-900">{profileInfo.role}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">Specialization</p><p className="text-sm font-medium text-slate-900">{profileInfo.specialization || "Not set"}</p></div>
                <div className="sm:col-span-2"><p className="text-xs text-slate-500 mb-1">About</p><p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">{profileInfo.notes || "Not set"}</p></div>
              </div>
            </div>

            {/* Assigned Patients */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-bold text-[#1a3c34] mb-6">Assigned Patients</h3>
              {assignedPatients.length === 0 ? (
                <p className="text-sm text-slate-500">No patients assigned yet.</p>
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {assignedPatients.map((patient) => (
                  <div key={patient._id} className="p-4 border border-slate-200 rounded-lg hover:border-[#0d9488] transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: patient.color }}>{patient.initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{patient.name}</p>
                        <p className="text-xs text-slate-500 truncate">{patient.diagnosis}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{patient.age > 0 ? `Age ${patient.age}` : "Age not set"}</span>
                      <button onClick={() => openView(patient)} className="text-[#0d9488] font-semibold hover:underline">View</button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
            </>
            )}
          </div>
        </main>
      </div>

      {/* Edit Profile modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a3c34] mb-4">Edit Profile</h3>
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 1234567" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input value={profileInfo.email} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500" />
                <p className="text-xs text-slate-400 mt-1">Email is your login and can’t be changed here.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Geriatric Care" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">About</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="A short note about your experience or focus..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] resize-none" />
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#0d9488] text-white hover:bg-[#0a7a70] disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View patient modal */}
      {showView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowView(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1a3c34]">{overviewName}</h3>
              <button onClick={() => setShowView(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            {overviewLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : overview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#f0fdf4] rounded-xl p-3 text-center"><div className="text-2xl font-extrabold text-[#0d9488]">{overview.medications?.total ?? 0}</div><div className="text-xs text-slate-500 mt-0.5">Medications</div></div>
                  <div className="bg-[#eff6ff] rounded-xl p-3 text-center"><div className="text-2xl font-extrabold text-[#2563eb]">{overview.routines?.total ?? 0}</div><div className="text-xs text-slate-500 mt-0.5">Routines</div></div>
                  <div className="bg-[#fef2f2] rounded-xl p-3 text-center"><div className="text-2xl font-extrabold text-[#dc2626]">{overview.alerts?.length ?? 0}</div><div className="text-xs text-slate-500 mt-0.5">Open Alerts</div></div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Purpose</span><span className="font-medium text-slate-900 text-right">{overview.patient?.diagnosis || "Not specified"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900 text-right break-all">{overview.patient?.user?.email || "—"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900 text-right">{overview.patient?.user?.phone || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">City</span><span className="font-medium text-slate-900 text-right">{overview.patient?.city || "—"}</span></div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-8 text-center">Could not load patient details.</p>
            )}
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
