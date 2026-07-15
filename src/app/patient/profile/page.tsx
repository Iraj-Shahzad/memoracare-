/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut } from "@/lib/api";

export default function ProfilePage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;
  const userName = user?.name || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const [editMode, setEditMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Personal Information
  const [fullName, setFullName] = useState(user?.name || "Ahmed Khan");
  const [dateOfBirth, setDateOfBirth] = useState("1958-03-15");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState(user?.phone || "+92 312 456 7890");
  const [email, setEmail] = useState(user?.email || "ahmed.khan@email.com");
  const [address, setAddress] = useState("House 42, Street 5, F-7/2, Islamabad, Pakistan");
  const [cnic, setCnic] = useState("34201-9876543-1");

  // Medical Information
  const [diagnosis, setDiagnosis] = useState("Alzheimer's Disease - Early Stage");
  const [doctor, setDoctor] = useState("Dr. Farhan Malik");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [allergies, setAllergies] = useState("Penicillin, Shellfish");
  const [medicalHistory, setMedicalHistory] = useState(
    "Hypertension (controlled), Type 2 Diabetes (managed with insulin)"
  );

  // Emergency Contacts
  const [primaryContact, setPrimaryContact] = useState("Fatima Khan");
  const [primaryRelation, setPrimaryRelation] = useState("Daughter");
  const [primaryPhone, setPrimaryPhone] = useState("+92 300 123 4567");
  const [secondaryContact, setSecondaryContact] = useState("Ali Khan");
  const [secondaryRelation, setSecondaryRelation] = useState("Son");
  const [secondaryPhone, setSecondaryPhone] = useState("+92 321 987 6543");

  // Caregiver Information
  const [caregiverName, setCaregiverName] = useState("Sarah Khan");
  const [caregiverRelation, setCaregiverRelation] = useState("Wife");
  const [caregiverPhone, setCaregiverPhone] = useState("+92 333 555 8888");
  const [caregiverEmail, setCaregiverEmail] = useState("sarah.khan@email.com");

  useEffect(() => {
    if (!patientId) return;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiGet(`/patients/${patientId}`).catch(() => null);
        if (res?.patient) {
          const p = res.patient;
          if (p.name) setFullName(p.name);
          if (p.dateOfBirth) setDateOfBirth(p.dateOfBirth.split("T")[0]);
          if (p.gender) setGender(p.gender);
          if (p.phone) setPhone(p.phone);
          if (p.email) setEmail(p.email);
          if (p.address) setAddress(p.address);
          if (p.cnic) setCnic(p.cnic);
          if (p.diagnosis) setDiagnosis(p.diagnosis);
          if (p.doctor) setDoctor(p.doctor);
          if (p.bloodGroup) setBloodGroup(p.bloodGroup);
          if (p.allergies) setAllergies(Array.isArray(p.allergies) ? p.allergies.join(", ") : p.allergies);
          if (p.medicalHistory) setMedicalHistory(p.medicalHistory);
          if (p.emergencyContacts) {
            const ec = p.emergencyContacts;
            if (ec[0]) {
              setPrimaryContact(ec[0].name || "");
              setPrimaryRelation(ec[0].relation || ec[0].relationship || "");
              setPrimaryPhone(ec[0].phone || "");
            }
            if (ec[1]) {
              setSecondaryContact(ec[1].name || "");
              setSecondaryRelation(ec[1].relation || ec[1].relationship || "");
              setSecondaryPhone(ec[1].phone || "");
            }
          }
          if (p.caregiver) {
            setCaregiverName(p.caregiver.name || "");
            setCaregiverRelation(p.caregiver.relation || p.caregiver.relationship || "");
            setCaregiverPhone(p.caregiver.phone || "");
            setCaregiverEmail(p.caregiver.email || "");
          }
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [patientId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiPut(`/patients/${patientId}`, {
        name: fullName,
        dateOfBirth,
        gender,
        phone,
        email,
        address,
        cnic,
        diagnosis,
        doctor,
        bloodGroup,
        allergies,
        medicalHistory,
        emergencyContacts: [
          { name: primaryContact, relation: primaryRelation, phone: primaryPhone },
          { name: secondaryContact, relation: secondaryRelation, phone: secondaryPhone },
        ],
        caregiver: {
          name: caregiverName,
          relation: caregiverRelation,
          phone: caregiverPhone,
          email: caregiverEmail,
        },
      });
      setEditMode(null);
    } catch (err) {
      console.error("Profile save error:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(null);
  };

  const renderPersonalInfo = () => {
    if (editMode === "personal") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CNIC
            </label>
            <input
              type="text"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0a7f73] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-gray-600">Full Name</p>
            <p className="font-medium">{fullName}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="font-medium">
              {new Date(dateOfBirth).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gender</p>
            <p className="font-medium">{gender}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium">{phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{email}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Address</p>
          <p className="font-medium">{address}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">CNIC</p>
          <p className="font-medium">{cnic}</p>
        </div>
      </div>
    );
  };

  const renderMedicalInfo = () => {
    if (editMode === "medical") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doctor
            </label>
            <input
              type="text"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              >
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>O+</option>
                <option>O-</option>
                <option>AB+</option>
                <option>AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allergies
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medical History
            </label>
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0a7f73] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Diagnosis</p>
          <p className="font-medium">{diagnosis}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Doctor</p>
          <p className="font-medium">{doctor}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Blood Group</p>
            <p className="font-medium">{bloodGroup}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Allergies</p>
            <p className="font-medium">{allergies}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Medical History</p>
          <p className="font-medium">{medicalHistory}</p>
        </div>
      </div>
    );
  };

  const renderEmergencyContacts = () => {
    if (editMode === "emergency") {
      return (
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-3">Primary Contact</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={primaryContact}
                  onChange={(e) => setPrimaryContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={primaryRelation}
                    onChange={(e) => setPrimaryRelation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Secondary Contact</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={secondaryContact}
                  onChange={(e) => setSecondaryContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={secondaryRelation}
                    onChange={(e) => setSecondaryRelation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0a7f73] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h4 className="font-semibold text-[#1a3c34] mb-2">Primary Contact</h4>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">
                {primaryContact} ({primaryRelation})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{primaryPhone}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-[#1a3c34] mb-2">Secondary Contact</h4>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">
                {secondaryContact} ({secondaryRelation})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{secondaryPhone}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCaregiverInfo = () => {
    if (editMode === "caregiver") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caregiver Name
            </label>
            <input
              type="text"
              value={caregiverName}
              onChange={(e) => setCaregiverName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship
            </label>
            <input
              type="text"
              value={caregiverRelation}
              onChange={(e) => setCaregiverRelation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={caregiverPhone}
              onChange={(e) => setCaregiverPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={caregiverEmail}
              onChange={(e) => setCaregiverEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0a7f73] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Caregiver Name</p>
          <p className="font-medium">
            {caregiverName} ({caregiverRelation})
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium">{caregiverPhone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{caregiverEmail}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex h-screen bg-[#f0fdf4]">
          <PatientSidebar />
          <div className="ml-0 md:ml-[260px] flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b]">Loading profile...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
    <div className="flex h-screen bg-[#f0fdf4]">
      <PatientSidebar />
      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col">
        <Topbar title="My Profile" />
        <div className="flex-1 overflow-auto p-6">
          {/* Profile Header */}
          <div className="mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-[#0d9488] flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">{initials}</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#1a3c34]">{fullName}</h1>
                  <div className="mt-2">
                    <span className="inline-block px-3 py-1 bg-[#0d9488] text-white text-sm font-medium rounded-full">
                      Patient
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2">Patient ID: {patientId ? `MEM-${patientId.slice(-6).toUpperCase()}` : "MEM-2024-001"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#1a3c34]">Personal Information</h2>
              <button
                onClick={() =>
                  setEditMode(editMode === "personal" ? null : "personal")
                }
                className="px-4 py-2 text-[#0d9488] font-medium hover:bg-[#f0fdf4] rounded-lg transition"
              >
                {editMode === "personal" ? "Cancel" : "Edit"}
              </button>
            </div>
            {renderPersonalInfo()}
          </div>

          {/* Medical Information Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#1a3c34]">Medical Information</h2>
              <button
                onClick={() =>
                  setEditMode(editMode === "medical" ? null : "medical")
                }
                className="px-4 py-2 text-[#0d9488] font-medium hover:bg-[#f0fdf4] rounded-lg transition"
              >
                {editMode === "medical" ? "Cancel" : "Edit"}
              </button>
            </div>
            {renderMedicalInfo()}
          </div>

          {/* Emergency Contacts Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#1a3c34]">Emergency Contacts</h2>
              <button
                onClick={() =>
                  setEditMode(editMode === "emergency" ? null : "emergency")
                }
                className="px-4 py-2 text-[#0d9488] font-medium hover:bg-[#f0fdf4] rounded-lg transition"
              >
                {editMode === "emergency" ? "Cancel" : "Edit"}
              </button>
            </div>
            {renderEmergencyContacts()}
          </div>

          {/* Caregiver Information Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#1a3c34]">Caregiver Information</h2>
              <button
                onClick={() =>
                  setEditMode(editMode === "caregiver" ? null : "caregiver")
                }
                className="px-4 py-2 text-[#0d9488] font-medium hover:bg-[#f0fdf4] rounded-lg transition"
              >
                {editMode === "caregiver" ? "Cancel" : "Edit"}
              </button>
            </div>
            {renderCaregiverInfo()}
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
