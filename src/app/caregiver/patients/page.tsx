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
  email: string;
  phone: string;
  diagnosis: string;
  age: number;
  gender: string;
  city: string;
  compliance: number;
  lastActivity: string;
  initials: string;
  color: string;
  status: string;
}

interface Overview {
  patient: {
    diagnosis?: string;
    dateOfBirth?: string;
    gender?: string;
    city?: string;
    address?: string;
    bloodGroup?: string;
    doctor?: string;
    user?: { name?: string; email?: string; phone?: string };
  };
  medications: { total: number };
  routines: { total: number };
  alerts: Array<{ _id: string; message?: string; severity?: string; createdAt?: string }>;
}

const DIAGNOSES = [
  "Alzheimer's Disease (Early Stage)",
  "Alzheimer's Disease (Moderate Stage)",
  "Alzheimer's Disease (Advanced Stage)",
  "Mild Cognitive Impairment (MCI)",
  "Vascular Dementia",
  "Lewy Body Dementia",
  "Frontotemporal Dementia",
];

export default function PatientsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Patient modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", password: "", diagnosis: DIAGNOSES[0], dateOfBirth: "", gender: "Male", phone: "",
  });

  // View Details modal
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewName, setOverviewName] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [showOverview, setShowOverview] = useState(false);

  const loadPatients = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiGet("/caregiver/my-patients");
      const data = res.patients || res.data || res || [];
      setPatients(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.name.trim().length < 3) { setFormError("Enter the patient's full name (min 3 characters)."); return; }
    if (!emailRe.test(form.email.trim())) { setFormError("Enter a valid email address."); return; }
    if (form.password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date()) { setFormError("Date of birth cannot be in the future."); return; }
    try {
      setSaving(true);
      await apiPost("/caregiver/patients", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        diagnosis: form.diagnosis,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        phone: form.phone.trim() || undefined,
      });
      setShowAddModal(false);
      setForm({ name: "", email: "", password: "", diagnosis: DIAGNOSES[0], dateOfBirth: "", gender: "Male", phone: "" });
      await loadPatients(true);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create patient");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (patient: Patient) => {
    setOverviewName(patient.name);
    setShowOverview(true);
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
  const initials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="My Patients"
          subtitle="Manage all patient profiles and details"
          greeting={`Good Morning, ${firstName}`}
          avatar={initials}
          showSOS={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Search and Add Button */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="flex-1 min-w-[200px] relative">
                <input
                  type="text"
                  placeholder="Search patients by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <button onClick={() => { setShowAddModal(true); setFormError(""); }} className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Patient
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748b]">Loading patients...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            <>
            {/* Patient Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <div key={patient._id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow reveal">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: patient.color }}>
                        {patient.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{patient.name}</p>
                        <p className="text-xs text-slate-500">{patient.age > 0 ? `Age ${patient.age}` : "Age not set"}</p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${patient.status === "active" ? "bg-green-500" : "bg-slate-400"}`} />
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-1">Diagnosis</p>
                    <p className="text-sm font-medium text-slate-900">{patient.diagnosis}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-500">Medication Compliance</p>
                      <p className="text-sm font-bold text-[#0d9488]">{patient.compliance}%</p>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-[#0d9488] h-2 rounded-full" style={{ width: `${patient.compliance}%` }} />
                    </div>
                  </div>

                  <div className="mb-4 pb-4 border-b border-slate-200">
                    <p className="text-xs text-slate-500">Last Activity</p>
                    <p className="text-sm text-slate-600">{patient.lastActivity}</p>
                  </div>

                  <button onClick={() => openDetails(patient)} className="w-full px-4 py-2.5 border border-[#0d9488] text-[#0d9488] rounded-lg text-sm font-semibold hover:bg-[#f0fdf4] transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-600">
                  {patients.length === 0 ? "No patients yet. Click “Add Patient” to onboard one." : "No patients found matching your search."}
                </p>
              </div>
            )}
            </>
            )}
          </div>
        </main>
      </div>

      {/* Add Patient modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a3c34] mb-1">Add New Patient</h3>
            <p className="text-sm text-slate-500 mb-4">Creates a patient login and assigns them to you.</p>
            <form onSubmit={submitPatient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ahmed Ali" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="patient@example.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password *</label>
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 characters" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis</label>
                <select value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]">
                  {DIAGNOSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#0d9488] text-white hover:bg-[#0a7a70] disabled:opacity-60">{saving ? "Creating..." : "Create Patient"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details modal */}
      {showOverview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowOverview(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1a3c34]">{overviewName}</h3>
              <button onClick={() => setShowOverview(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            {overviewLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : overview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#f0fdf4] rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold text-[#0d9488]">{overview.medications?.total ?? 0}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Medications</div>
                  </div>
                  <div className="bg-[#eff6ff] rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold text-[#2563eb]">{overview.routines?.total ?? 0}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Routines</div>
                  </div>
                  <div className="bg-[#fef2f2] rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold text-[#dc2626]">{overview.alerts?.length ?? 0}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Open Alerts</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Diagnosis</span><span className="font-medium text-slate-900 text-right">{overview.patient?.diagnosis || "Not specified"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900 text-right break-all">{overview.patient?.user?.email || "—"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900 text-right">{overview.patient?.user?.phone || "—"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Gender</span><span className="font-medium text-slate-900 text-right">{overview.patient?.gender || "—"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Doctor</span><span className="font-medium text-slate-900 text-right">{overview.patient?.doctor || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">City</span><span className="font-medium text-slate-900 text-right">{overview.patient?.city || "—"}</span></div>
                </div>

                {overview.alerts && overview.alerts.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Recent Alerts</p>
                    <div className="space-y-2">
                      {overview.alerts.slice(0, 4).map((a) => (
                        <div key={a._id} className="text-xs bg-slate-50 rounded-lg px-3 py-2 flex justify-between gap-2">
                          <span className="text-slate-700">{a.message || a.severity}</span>
                          <span className="text-slate-400 whitespace-nowrap">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
