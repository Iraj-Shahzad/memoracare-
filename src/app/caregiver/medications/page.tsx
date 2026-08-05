"use client";

/**
 * CAREGIVER MEDICATIONS — pick an assigned patient, see their medication schedule
 * (with taken/missed/upcoming status), add new medications, and remove them.
 *
 * Key concepts: first loads GET /caregiver/my-patients and auto-selects the first; changing
 * the patient re-fetches GET /medications/patient/:id. Status-count stat cards (Total/Taken/
 * Missed/Upcoming) are derived client-side from the medication list. Add Medication POSTs to
 * /medications with one or more reminder times; validation enforces a real name, a
 * "number + unit" dosage regex (e.g. 10mg), and 24h HH:MM times — because a med with no valid
 * time would never remind the patient. Delete uses a confirm() dialog then DELETE /medications/:id.
 * ProtectedRoute caregiver-only.
 * Viva line: "Medications are always scoped to the selected assigned patient, and I validate dosage and reminder times on the client so an unusable schedule can't be saved".
 */

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { timeGreeting } from "@/lib/greeting";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { formatTime12 } from "@/lib/time";
import { useUI } from "@/components/ui/UIProvider";
import { useState, useEffect } from "react";

interface Patient {
  _id: string;
  name: string;
}

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  status: string;
  lastUpdated: string;
}

export default function MedicationsPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<{ name: string; dosage: string; frequency: string; times: string[] }>({
    name: "", dosage: "", frequency: "Once daily", times: [""],
  });

  // Fetch patients list
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await apiGet("/caregiver/my-patients");
        const data = res.data || res.patients || res || [];
        const list = Array.isArray(data) ? data : [];
        // Patient name is nested under the populated `user` object.
        const nameOf = (p: Record<string, unknown>) =>
          ((p.user as Record<string, unknown> | undefined)?.name as string) || (p.name as string) || "Unnamed patient";
        setPatients(list.map((p: Record<string, unknown>) => ({ _id: (p._id || p.id) as string, name: nameOf(p) })));
        if (list.length > 0) {
          const first = list[0] as Record<string, unknown>;
          setSelectedPatientId((first._id || first.id) as string);
          setSelectedPatientName(nameOf(first));
        }
      } catch {
        // patients will remain empty
      }
    };
    fetchPatients();
  }, []);

  // Fetch medications when patient changes
  useEffect(() => {
    if (!selectedPatientId) {
      setLoading(false);
      return;
    }
    const fetchMedications = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiGet(`/medications/patient/${selectedPatientId}`);
        const data = res.data || res.medications || res || [];
        const list = Array.isArray(data) ? data : [];
        setMedications(list.map((m: Record<string, unknown>) => ({
          _id: (m._id || m.id || '') as string,
          name: (m.name || '') as string,
          dosage: (m.dosage || '') as string,
          frequency: (m.frequency || '') as string,
          time: (m.time || (Array.isArray(m.times) ? (m.times as string[]).join(', ') : m.scheduledTime) || '') as string,
          status: (m.status || 'upcoming') as string,
          lastUpdated: (m.lastUpdated || m.updatedAt || '') as string,
        })));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load medications";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchMedications();
  }, [selectedPatientId]);

  const refetchMedications = async () => {
    const res = await apiGet(`/medications/patient/${selectedPatientId}`);
    const data = res.data || res.medications || res || [];
    const list = Array.isArray(data) ? data : [];
    setMedications(list.map((m: Record<string, unknown>) => ({
      _id: (m._id || m.id || '') as string,
      name: (m.name || '') as string,
      dosage: (m.dosage || '') as string,
      frequency: (m.frequency || '') as string,
      time: (m.time || (Array.isArray(m.times) ? (m.times as string[]).join(', ') : m.scheduledTime) || '') as string,
      status: (m.status || 'upcoming') as string,
      lastUpdated: (m.lastUpdated || m.updatedAt || '') as string,
    })));
  };

  const submitMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // ---- Validation ----
    const times = form.times.map((t) => t.trim()).filter(Boolean);
    const name = form.name.trim();
    const dosage = form.dosage.trim();
    if (!selectedPatientId) { setFormError("Please select a patient first."); return; }
    if (name.length < 2 || !/[a-zA-Z]/.test(name)) { setFormError("Enter a valid medication name (letters, at least 2 characters)."); return; }
    // Dosage must be a numeric amount followed by a unit, e.g. 10mg, 5 ml, 400 IU.
    if (!/^\d+(\.\d+)?\s*[a-zA-Z%µ]+$/.test(dosage)) {
      setFormError("Dosage must be a number followed by a unit — e.g. 10mg, 5 ml, 400 IU.");
      return;
    }
    if (times.length === 0) { setFormError("Add at least one reminder time — otherwise the patient won't be reminded."); return; }
    // Every time must be valid 24h HH:MM (the time picker enforces this, but double-check).
    const timeOk = times.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
    if (!timeOk) { setFormError("Times must be in 24-hour HH:MM format (e.g. 09:00, 21:30)."); return; }

    try {
      setSaving(true);
      await apiPost("/medications", {
        patient: selectedPatientId,
        name,
        dosage,
        frequency: form.frequency,
        times,
      });
      setShowAddModal(false);
      setForm({ name: "", dosage: "", frequency: "Once daily", times: [""] });
      await refetchMedications();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add medication");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedication = async (id: string, medName: string) => {
    if (!(await confirm({ message: `Remove "${medName}"? This deletes it from the patient's schedule.`, danger: true, confirmText: "Remove" }))) return;
    try {
      await apiDelete(`/medications/${id}`);
      await refetchMedications();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to remove medication", "error");
    }
  };

  // Render a stored ISO timestamp as a readable local date/time.
  const fmtDate = (raw: string) => {
    if (!raw) return "—";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPatientId(id);
    const found = patients.find(p => p._id === id);
    setSelectedPatientName(found?.name || "");
  };

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  const stats = [
    { label: "Total Medications", value: String(medications.length), icon: "pill" },
    { label: "Taken Today", value: String(medications.filter(m => m.status === "taken").length), icon: "check" },
    { label: "Missed", value: String(medications.filter(m => m.status === "missed").length), icon: "cross" },
    { label: "Upcoming", value: String(medications.filter(m => m.status === "upcoming").length), icon: "clock" },
  ];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "taken":
        return "bg-green-100 text-green-700";
      case "missed":
        return "bg-red-100 text-red-700";
      case "upcoming":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIndicatorColor = (status: string) => {
    switch (status) {
      case "taken":
        return "bg-green-500";
      case "missed":
        return "bg-red-500";
      case "upcoming":
        return "bg-yellow-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar
          title="Medications"
          subtitle="Track medication adherence and schedules"
          greeting={timeGreeting(firstName)}
          avatar={userInitials}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Patient Selector and Add Button */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Patient
                </label>
                <select
                  value={selectedPatientId}
                  onChange={handlePatientChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                >
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-7">
                <button onClick={() => { if (selectedPatientId) setShowAddModal(true); }} className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Medication
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748b]">Loading medications...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 border border-slate-200">
                  <p className="text-slate-600 text-sm font-medium mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-[#1a3c34]">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Medication Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-[#1a3c34]">Medication Schedule{selectedPatientName ? ` - ${selectedPatientName}` : ''}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Medication
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Dosage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Frequency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {medications.map((med) => (
                      <tr key={med._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3">
                          <span className="text-sm font-medium text-slate-900">{med.name}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-slate-600">{med.dosage}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-slate-600">{med.frequency}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-slate-600">{formatTime12(med.time)}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                              med.status
                            )}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusIndicatorColor(med.status)}`} />
                            {med.status.charAt(0).toUpperCase() + med.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-slate-600">{fmtDate(med.lastUpdated)}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => handleDeleteMedication(med._id, med.name)}
                            className="text-red-600 hover:text-red-700 text-sm font-semibold"
                          >
                            Remove
                          </button>
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

          {/* Add Medication modal form */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddModal(false)}>
              <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-[#1a3c34] mb-1">Add Medication</h3>
                <p className="text-sm text-[#64748b] mb-5">For {selectedPatientName || "the selected patient"}</p>
                <form onSubmit={submitMedication} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medication name *</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Donepezil (Aricept)" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dosage *</label>
                    <input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} required placeholder="e.g. 10mg" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                    <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]">
                      <option>Once daily</option>
                      <option>Twice daily</option>
                      <option>Three times daily</option>
                      <option>Four times daily</option>
                      <option>As needed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reminder time(s) * <span className="font-normal text-slate-400">— when the patient is reminded</span></label>
                    {form.times.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="time" value={t} onChange={(e) => { const nt = [...form.times]; nt[i] = e.target.value; setForm({ ...form, times: nt }); }} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]" />
                        {form.times.length > 1 && (
                          <button type="button" onClick={() => setForm({ ...form, times: form.times.filter((_, idx) => idx !== i) })} className="w-9 h-9 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50" aria-label="Remove time">✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm({ ...form, times: [...form.times, ""] })} className="text-[#0d9488] text-sm font-semibold">+ Add another time</button>
                  </div>
                  {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setShowAddModal(false); setFormError(""); }} className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#0d9488] text-white hover:bg-[#0a7a70] disabled:opacity-60">{saving ? "Saving..." : "Add Medication"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
