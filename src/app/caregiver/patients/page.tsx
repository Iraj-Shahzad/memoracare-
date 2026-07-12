"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";
import { useState, useEffect } from "react";

interface Patient {
  _id: string;
  name: string;
  diagnosis: string;
  age: number;
  compliance: number;
  lastActivity: string;
  initials: string;
  bgColor: string;
  status: string;
}

export default function PatientsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const res = await apiGet("/caregiver/my-patients");
        const data = res.data || res.patients || res || [];
        const mapped = (Array.isArray(data) ? data : []).map((p: Record<string, unknown>) => ({
          _id: (p._id || p.id || '') as string,
          name: (p.name || '') as string,
          diagnosis: (p.diagnosis || p.condition || '') as string,
          age: (p.age || 0) as number,
          compliance: (p.compliance || p.medicationCompliance || 0) as number,
          lastActivity: (p.lastActivity || 'N/A') as string,
          initials: (p.initials || (p.name as string)?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || '') as string,
          bgColor: (p.bgColor || 'bg-teal-500') as string,
          status: (p.status || 'active') as string,
        }));
        setPatients(mapped);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load patients";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const initials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="My Patients"
          subtitle="Manage all patient profiles and details"
          greeting={`Good Morning, ${firstName}`}
          avatar={initials}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Search and Add Button */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search patients by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <button className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors flex items-center gap-2">
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
            <div className="grid grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <div key={patient._id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-12 h-12 ${patient.bgColor} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                        {patient.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{patient.name}</p>
                        <p className="text-xs text-slate-500">Age {patient.age}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${patient.status === "active" ? "bg-green-500" : "bg-slate-400"}`} />
                    </div>
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
                      <div
                        className="bg-[#0d9488] h-2 rounded-full"
                        style={{ width: `${patient.compliance}%` }}
                      />
                    </div>
                  </div>

                  <div className="mb-4 pb-4 border-b border-slate-200">
                    <p className="text-xs text-slate-500">Last Activity</p>
                    <p className="text-sm text-slate-600">{patient.lastActivity}</p>
                  </div>

                  <button className="w-full px-4 py-2.5 border border-[#0d9488] text-[#0d9488] rounded-lg text-sm font-semibold hover:bg-[#f0fdf4] transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-600">No patients found matching your search.</p>
              </div>
            )}
            </>
            )}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
