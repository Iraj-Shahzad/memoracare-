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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch patients list
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await apiGet("/caregiver/my-patients");
        const data = res.data || res.patients || res || [];
        const list = Array.isArray(data) ? data : [];
        setPatients(list.map((p: Record<string, unknown>) => ({ _id: (p._id || p.id) as string, name: p.name as string })));
        if (list.length > 0) {
          const first = list[0] as Record<string, unknown>;
          setSelectedPatientId((first._id || first.id) as string);
          setSelectedPatientName(first.name as string);
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
          time: (m.time || m.scheduledTime || '') as string,
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

  const handleAddMedication = async () => {
    if (!selectedPatientId) return;
    const name = prompt("Medication name:");
    if (!name) return;
    const dosage = prompt("Dosage (e.g., 10mg):");
    const frequency = prompt("Frequency (e.g., Once daily):");
    try {
      await apiPost("/medications", { name, dosage, frequency, patient: selectedPatientId });
      // Re-fetch
      const res = await apiGet(`/medications/patient/${selectedPatientId}`);
      const data = res.data || res.medications || res || [];
      const list = Array.isArray(data) ? data : [];
      setMedications(list.map((m: Record<string, unknown>) => ({
        _id: (m._id || m.id || '') as string,
        name: (m.name || '') as string,
        dosage: (m.dosage || '') as string,
        frequency: (m.frequency || '') as string,
        time: (m.time || m.scheduledTime || '') as string,
        status: (m.status || 'upcoming') as string,
        lastUpdated: (m.lastUpdated || m.updatedAt || '') as string,
      })));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add medication");
    }
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

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="Medications"
          subtitle="Track medication adherence and schedules"
          greeting={`Good Morning, ${firstName}`}
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
                <button onClick={handleAddMedication} className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors flex items-center gap-2">
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
            <div className="grid grid-cols-4 gap-6 mb-8">
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
                          <span className="text-sm text-slate-600">{med.time}</span>
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
                          <span className="text-sm text-slate-600">{med.lastUpdated}</span>
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
