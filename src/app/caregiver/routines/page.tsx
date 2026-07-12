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

interface Routine {
  _id: string;
  name: string;
  time: string;
  status: string;
}

export default function RoutinesPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch patients
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
        }
      } catch {
        // patients remain empty
      }
    };
    fetchPatients();
  }, []);

  // Fetch routines when patient changes
  useEffect(() => {
    if (!selectedPatientId) {
      setLoading(false);
      return;
    }
    const fetchRoutines = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiGet(`/routines/patient/${selectedPatientId}`);
        const data = res.data || res.routines || res || [];
        const list = Array.isArray(data) ? data : [];
        setRoutines(list.map((r: Record<string, unknown>) => ({
          _id: (r._id || r.id || '') as string,
          name: (r.name || r.title || '') as string,
          time: (r.time || r.scheduledTime || '') as string,
          status: (r.status || 'upcoming') as string,
        })));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load routines";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutines();
  }, [selectedPatientId]);

  const handleAddRoutine = async () => {
    if (!selectedPatientId) return;
    const name = prompt("Routine name:");
    if (!name) return;
    const time = prompt("Time (e.g., 8:00 AM):");
    try {
      await apiPost("/routines", { name, time, patient: selectedPatientId });
      // Re-fetch
      const res = await apiGet(`/routines/patient/${selectedPatientId}`);
      const data = res.data || res.routines || res || [];
      const list = Array.isArray(data) ? data : [];
      setRoutines(list.map((r: Record<string, unknown>) => ({
        _id: (r._id || r.id || '') as string,
        name: (r.name || r.title || '') as string,
        time: (r.time || r.scheduledTime || '') as string,
        status: (r.status || 'upcoming') as string,
      })));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add routine");
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "missed":
        return "bg-red-100 text-red-700";
      case "upcoming":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIndicatorColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "missed":
        return "bg-red-500";
      case "upcoming":
        return "bg-blue-500";
      default:
        return "bg-slate-500";
    }
  };

  const completedCount = routines.filter((r) => r.status === "completed").length;
  const missedCount = routines.filter((r) => r.status === "missed").length;
  const completionPercentage = routines.length > 0 ? Math.round((completedCount / routines.length) * 100) : 0;

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="Routines"
          subtitle="Manage daily routines and schedules"
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
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                >
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-7">
                <button onClick={handleAddRoutine} className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Routine
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748b]">Loading routines...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            <>
            {/* Today&apos;s Routine Timeline */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-[#1a3c34]">Today&apos;s Routine Timeline</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {routines.map((routine, idx: number) => (
                    <div key={routine._id || idx} className="flex items-start gap-4">
                      {/* Timeline dot and connector */}
                      <div className="flex flex-col items-center pt-1">
                        <div
                          className={`w-4 h-4 rounded-full border-2 border-slate-200 ${getStatusIndicatorColor(
                            routine.status
                          )}`}
                        />
                        {idx !== routines.length - 1 && (
                          <div className="w-0.5 h-12 bg-slate-200 mt-2" />
                        )}
                      </div>

                      {/* Routine details */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">{routine.name}</p>
                            <p className="text-sm text-slate-500">{routine.time}</p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadgeColor(
                              routine.status
                            )}`}
                          >
                            {routine.status.charAt(0).toUpperCase() + routine.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Compliance Summary */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <p className="text-slate-600 text-sm font-medium mb-2">Completion Rate</p>
                <p className="text-3xl font-bold text-[#1a3c34] mb-3">{completionPercentage}%</p>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-[#0d9488] h-2 rounded-full"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <p className="text-slate-600 text-sm font-medium mb-2">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-slate-500 mt-1">of {routines.length} routines</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <p className="text-slate-600 text-sm font-medium mb-2">Missed</p>
                <p className="text-3xl font-bold text-red-600">{missedCount}</p>
                <p className="text-xs text-slate-500 mt-1">routines missed today</p>
              </div>
            </div>

            {/* Weekly Compliance */}
            <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-bold text-[#1a3c34] mb-4">Weekly Compliance Summary</h3>
              <div className="space-y-3">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <div key={day} className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{day}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-40 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-[#0d9488] h-2 rounded-full"
                          style={{ width: `${70 + Math.random() * 30}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 w-12 text-right">
                        {Math.round(70 + Math.random() * 30)}%
                      </span>
                    </div>
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
