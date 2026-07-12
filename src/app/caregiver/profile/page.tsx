"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";
import { useState, useEffect } from "react";

interface ProfileInfo {
  name: string;
  role: string;
  initials: string;
  bgColor: string;
  phone: string;
  email: string;
  cnic: string;
  city: string;
}

interface AssignedPatient {
  _id: string;
  name: string;
  diagnosis: string;
  age: number;
  initials: string;
  bgColor: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profileInfo, setProfileInfo] = useState<ProfileInfo>({
    name: "",
    role: "Caregiver",
    initials: "",
    bgColor: "bg-gradient-to-br from-teal-400 to-[#0d9488]",
    phone: "",
    email: "",
    cnic: "",
    city: "",
  });
  const [assignedPatients, setAssignedPatients] = useState<AssignedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Set profile from auth user
    if (user) {
      const initials = user.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";
      setProfileInfo({
        name: user.name || "",
        role: "Caregiver",
        initials,
        bgColor: "bg-gradient-to-br from-teal-400 to-[#0d9488]",
        phone: user.phone || "",
        email: user.email || "",
        cnic: (user.profile?.cnic as string) || "",
        city: (user.profile?.city as string) || "",
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const res = await apiGet("/caregiver/my-patients");
        const data = res.data || res.patients || res || [];
        const list = Array.isArray(data) ? data : [];
        const bgColors = ["bg-blue-500", "bg-orange-500", "bg-slate-500", "bg-purple-500", "bg-teal-500", "bg-indigo-500"];
        setAssignedPatients(list.map((p: Record<string, unknown>, idx: number) => ({
          _id: (p._id || p.id || '') as string,
          name: (p.name || '') as string,
          diagnosis: (p.diagnosis || p.condition || '') as string,
          age: (p.age || 0) as number,
          initials: (p.initials || (p.name as string)?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || '') as string,
          bgColor: (p.bgColor || bgColors[idx % bgColors.length]) as string,
        })));
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
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="My Profile"
          subtitle="Manage your caregiver information"
          greeting={`Good Morning, ${firstName}`}
          avatar={userInitials}
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
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div
                    className={`w-24 h-24 ${profileInfo.bgColor} rounded-2xl flex items-center justify-center text-white font-bold text-3xl`}
                  >
                    {profileInfo.initials}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-[#1a3c34] mb-1">
                      {profileInfo.name}
                    </h1>
                    <p className="text-lg text-slate-600">{profileInfo.role}</p>
                  </div>
                </div>
                <button className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors">
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-bold text-[#1a3c34] mb-6">Personal Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Full Name</p>
                    <p className="text-sm font-medium text-slate-900">{profileInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Phone Number</p>
                    <p className="text-sm font-medium text-slate-900">{profileInfo.phone || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email Address</p>
                    <p className="text-sm font-medium text-slate-900">{profileInfo.email}</p>
                  </div>
                  <button className="mt-4 px-4 py-2 text-sm font-semibold text-[#0d9488] border border-[#0d9488] rounded-lg hover:bg-[#f0fdf4] transition-colors w-full">
                    Edit Information
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-bold text-[#1a3c34] mb-6">Official Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">CNIC</p>
                    <p className="text-sm font-medium text-slate-900">{profileInfo.cnic || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">City</p>
                    <p className="text-sm font-medium text-slate-900">{profileInfo.city || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Role</p>
                    <p className="text-sm font-medium text-slate-900">{profileInfo.role}</p>
                  </div>
                  <button className="mt-4 px-4 py-2 text-sm font-semibold text-[#0d9488] border border-[#0d9488] rounded-lg hover:bg-[#f0fdf4] transition-colors w-full">
                    Edit Details
                  </button>
                </div>
              </div>
            </div>

            {/* Assigned Patients */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-bold text-[#1a3c34] mb-6">Assigned Patients</h3>
              <div className="grid grid-cols-2 gap-4">
                {assignedPatients.map((patient) => (
                  <div
                    key={patient._id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-[#0d9488] transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 ${patient.bgColor} rounded-lg flex items-center justify-center text-white font-bold text-sm`}
                      >
                        {patient.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">
                          {patient.name}
                        </p>
                        <p className="text-xs text-slate-500">{patient.diagnosis}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Age {patient.age}</span>
                      <button className="text-[#0d9488] font-semibold hover:underline">
                        View
                      </button>
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
