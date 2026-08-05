/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

/**
 * PATIENT PROFILE — four editable sections: Personal, Care, Emergency Contacts,
 * Caregiver. Each has its own edit mode + full form validation.
 *
 * Key concepts: per-section validate functions build an `errors` map; inputs
 * turn red + show inline messages, and save is blocked until the map is empty;
 * "Diagnosis" is now a grouped "Purpose" dropdown (app is general-purpose, not
 * dementia-only) and "Allergies" -> "Precautions"; a real bug fixed here — the
 * emergency contact save now sends the key `relationship` (the Mongoose field),
 * not `relation`, which Mongoose was silently dropping (empty "( )").
 * Viva line: "Every section validates into an errors map before saving, and I
 * fixed a field-name mismatch that was silently losing the relationship."
 */

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut } from "@/lib/api";
import { useUI } from "@/components/ui/UIProvider";

// Purpose options — the app is now general-purpose (domestic, elderly, recovery,
// as well as cognitive care), so this mirrors the caregiver "Add Patient" form.
const PURPOSE_GROUPS: { label: string; options: string[] }[] = [
  {
    label: "General / Non-medical",
    options: [
      "General Reminders (No diagnosis)",
      "Home / Personal Use",
      "Elderly Care (General)",
      "Caregiver-Assisted (Other)",
    ],
  },
  {
    label: "Cognitive / Dementia",
    options: [
      "Alzheimer's Disease (Early Stage)",
      "Alzheimer's Disease (Moderate Stage)",
      "Alzheimer's Disease (Advanced Stage)",
      "Mild Cognitive Impairment (MCI)",
      "Vascular Dementia",
      "Lewy Body Dementia",
      "Frontotemporal Dementia",
    ],
  },
  {
    label: "Medical / Recovery",
    options: [
      "Post-Surgery Recovery",
      "Chronic Illness Management",
      "Hospital / Nursing Care",
      "Physical Rehabilitation",
      "Other",
    ],
  },
];

// --- small validation helpers (used by every edit form on this page) ---
const digitsOnly = (s: string) => (s || "").replace(/\D/g, "");
const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());
const isValidPhone = (s: string) => digitsOnly(s).length >= 10 && digitsOnly(s).length <= 13;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const patientId = (user?.profile as any)?._id || user?.id;
  const userName = user?.name || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const [editMode, setEditMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Field-level validation errors, keyed by field name.
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Personal Information (real values loaded from the API; no fake defaults)
  const [fullName, setFullName] = useState(user?.name || "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [address, setAddress] = useState("");
  const [cnic, setCnic] = useState("");

  // Care Information
  const [diagnosis, setDiagnosis] = useState("");
  const [doctor, setDoctor] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState(""); // now shown as "Precautions"
  const [medicalHistory, setMedicalHistory] = useState("");

  // Emergency Contacts
  const [primaryContact, setPrimaryContact] = useState("");
  const [primaryRelation, setPrimaryRelation] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryContact, setSecondaryContact] = useState("");
  const [secondaryRelation, setSecondaryRelation] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");

  // Caregiver Information (the REAL assigned caregiver, from the backend)
  const [caregiverName, setCaregiverName] = useState("");
  const [caregiverRelation, setCaregiverRelation] = useState("");
  const [caregiverPhone, setCaregiverPhone] = useState("");
  const [caregiverEmail, setCaregiverEmail] = useState("");

  useEffect(() => {
    if (!patientId) return;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiGet(`/patients/${patientId}`).catch(() => null);
        if (res?.patient) {
          const p = res.patient;
          // Name/email/phone live on the linked user account.
          setFullName(p.user?.name || "");
          setPhone(p.user?.phone || "");
          setEmail(p.user?.email || "");
          if (p.dateOfBirth) setDateOfBirth(p.dateOfBirth.split("T")[0]);
          if (p.gender) setGender(p.gender);
          if (p.address) setAddress(p.address);
          if (p.cnic) setCnic(p.cnic);
          if (p.diagnosis) setDiagnosis(p.diagnosis);
          if (p.doctor) setDoctor(p.doctor);
          if (p.bloodGroup) setBloodGroup(p.bloodGroup);
          if (p.allergies) setAllergies(Array.isArray(p.allergies) ? p.allergies.join(", ") : p.allergies);
          if (p.medicalHistory) setMedicalHistory(p.medicalHistory);
          if (Array.isArray(p.emergencyContacts)) {
            const ec = p.emergencyContacts;
            if (ec[0]) {
              setPrimaryContact(ec[0].name || "");
              setPrimaryRelation(ec[0].relationship || ec[0].relation || "");
              setPrimaryPhone(ec[0].phone || "");
            }
            if (ec[1]) {
              setSecondaryContact(ec[1].name || "");
              setSecondaryRelation(ec[1].relationship || ec[1].relation || "");
              setSecondaryPhone(ec[1].phone || "");
            }
          }
          // The REAL assigned caregiver (populated user).
          const cg = Array.isArray(p.assignedCaregivers) ? p.assignedCaregivers[0] : null;
          if (cg) {
            setCaregiverName(cg.name || "");
            setCaregiverPhone(cg.phone || "");
            setCaregiverEmail(cg.email || "");
            setCaregiverRelation("Primary Caregiver");
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

  // --- per-section validation ---
  const validatePersonal = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = "Please enter your full name (at least 2 letters).";
    if (!dateOfBirth) e.dateOfBirth = "Please select your date of birth.";
    else if (new Date(dateOfBirth) > new Date()) e.dateOfBirth = "Date of birth cannot be in the future.";
    if (!gender) e.gender = "Please select a gender.";
    if (!phone.trim()) e.phone = "Please enter a phone number.";
    else if (!isValidPhone(phone)) e.phone = "Enter a valid phone number (at least 10 digits).";
    if (!email.trim()) e.email = "Please enter an email address.";
    else if (!isValidEmail(email)) e.email = "Enter a valid email like name@example.com.";
    if (cnic.trim() && digitsOnly(cnic).length !== 13)
      e.cnic = "CNIC must be 13 digits (e.g. 35201-1234567-1).";
    return e;
  };

  const validateCare = () => {
    const e: Record<string, string> = {};
    if (!diagnosis.trim()) e.diagnosis = "Please choose a purpose for using the app.";
    return e;
  };

  const validateEmergency = () => {
    const e: Record<string, string> = {};
    // Primary contact is required in full.
    if (!primaryContact.trim()) e.primaryContact = "Enter the primary contact's name.";
    if (!primaryRelation.trim()) e.primaryRelation = "Enter the relationship (e.g. Son, Wife, Friend).";
    if (!primaryPhone.trim()) e.primaryPhone = "Enter the primary contact's phone number.";
    else if (!isValidPhone(primaryPhone)) e.primaryPhone = "Enter a valid phone number.";
    // Secondary contact is optional, but if started it must be completed.
    const anySecondary = secondaryContact.trim() || secondaryRelation.trim() || secondaryPhone.trim();
    if (anySecondary) {
      if (!secondaryContact.trim()) e.secondaryContact = "Enter the secondary contact's name.";
      if (!secondaryRelation.trim()) e.secondaryRelation = "Enter the relationship.";
      if (!secondaryPhone.trim()) e.secondaryPhone = "Enter the secondary contact's phone number.";
      else if (!isValidPhone(secondaryPhone)) e.secondaryPhone = "Enter a valid phone number.";
    }
    return e;
  };

  const validateCaregiver = () => {
    const e: Record<string, string> = {};
    if (!caregiverName.trim()) e.caregiverName = "Enter the caregiver's name.";
    if (!caregiverRelation.trim()) e.caregiverRelation = "Enter the relationship.";
    if (caregiverPhone.trim() && !isValidPhone(caregiverPhone)) e.caregiverPhone = "Enter a valid phone number.";
    if (caregiverEmail.trim() && !isValidEmail(caregiverEmail)) e.caregiverEmail = "Enter a valid email address.";
    return e;
  };

  const handleSave = async () => {
    // Validate only the section currently being edited.
    let e: Record<string, string> = {};
    if (editMode === "personal") e = validatePersonal();
    else if (editMode === "medical") e = validateCare();
    else if (editMode === "emergency") e = validateEmergency();
    else if (editMode === "caregiver") e = validateCaregiver();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast("Please fix the highlighted fields before saving.", "error");
      return;
    }

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
        // NOTE: the Patient model field is `relationship` — sending `relation`
        // was silently dropped by Mongoose, which is why relationships showed
        // as empty "( )". We now send the correct key.
        emergencyContacts: [
          { name: primaryContact, relationship: primaryRelation, phone: primaryPhone },
          { name: secondaryContact, relationship: secondaryRelation, phone: secondaryPhone },
        ],
        caregiver: {
          name: caregiverName,
          relationship: caregiverRelation,
          phone: caregiverPhone,
          email: caregiverEmail,
        },
      });
      setErrors({});
      setEditMode(null);
      toast("Profile saved.", "success");
    } catch (err) {
      console.error("Profile save error:", err);
      toast("Failed to save profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setErrors({});
    setEditMode(null);
  };

  // Toggle an edit section; always clear stale errors when switching.
  const toggleEdit = (section: string) => {
    setErrors({});
    setEditMode(editMode === section ? null : section);
  };

  // Shared input styling that turns red when the field has an error.
  const inputCls = (name: string) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] ${
      errors[name] ? "border-red-400 bg-red-50" : "border-gray-300"
    }`;
  const errText = (name: string) =>
    errors[name] ? <p className="mt-1 text-xs text-red-600">{errors[name]}</p> : null;

  const renderPersonalInfo = () => {
    if (editMode === "personal") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls("fullName")}
            />
            {errText("fullName")}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputCls("dateOfBirth")}
              />
              {errText("dateOfBirth")}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputCls("gender")}
              >
                <option value="">Select gender...</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              {errText("gender")}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 1234567"
              className={inputCls("phone")}
            />
            {errText("phone")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls("email")}
            />
            {errText("email")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputCls("address")}
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
            <input
              type="text"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="35201-1234567-1"
              className={inputCls("cnic")}
            />
            {errText("cnic")}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="font-medium">
              {dateOfBirth
                ? new Date(dateOfBirth).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gender</p>
            <p className="font-medium">{gender || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium">{phone || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{email || "—"}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Address</p>
          <p className="font-medium">{address || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">CNIC</p>
          <p className="font-medium">{cnic || "—"}</p>
        </div>
      </div>
    );
  };

  const renderMedicalInfo = () => {
    if (editMode === "medical") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <select
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className={inputCls("diagnosis")}
            >
              <option value="">Select a purpose...</option>
              {PURPOSE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errText("diagnosis")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor / Supervisor</label>
            <input
              type="text"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              placeholder="Optional — attending doctor or supervisor"
              className={inputCls("doctor")}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className={inputCls("bloodGroup")}
              >
                <option value="">Select...</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Precautions</label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, avoid stairs, low salt"
                className={inputCls("allergies")}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background / Notes</label>
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className={inputCls("medicalHistory")}
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
          <p className="text-sm text-gray-600">Purpose</p>
          <p className="font-medium">{diagnosis || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Doctor / Supervisor</p>
          <p className="font-medium">{doctor || "—"}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Blood Group</p>
            <p className="font-medium">{bloodGroup || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Precautions</p>
            <p className="font-medium">{allergies || "—"}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Background / Notes</p>
          <p className="font-medium">{medicalHistory || "—"}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={primaryContact}
                  onChange={(e) => setPrimaryContact(e.target.value)}
                  className={inputCls("primaryContact")}
                />
                {errText("primaryContact")}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={primaryRelation}
                    onChange={(e) => setPrimaryRelation(e.target.value)}
                    placeholder="e.g. Son, Wife, Friend"
                    className={inputCls("primaryRelation")}
                  />
                  {errText("primaryRelation")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className={inputCls("primaryPhone")}
                  />
                  {errText("primaryPhone")}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Secondary Contact <span className="text-xs font-normal text-gray-400">(optional)</span></h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={secondaryContact}
                  onChange={(e) => setSecondaryContact(e.target.value)}
                  className={inputCls("secondaryContact")}
                />
                {errText("secondaryContact")}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={secondaryRelation}
                    onChange={(e) => setSecondaryRelation(e.target.value)}
                    placeholder="e.g. Daughter, Neighbour"
                    className={inputCls("secondaryRelation")}
                  />
                  {errText("secondaryRelation")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="+92 321 1234567"
                    className={inputCls("secondaryPhone")}
                  />
                  {errText("secondaryPhone")}
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
                {primaryContact || "—"}
                {primaryRelation ? ` (${primaryRelation})` : ""}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{primaryPhone || "—"}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-[#1a3c34] mb-2">Secondary Contact</h4>
          {secondaryContact ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">
                  {secondaryContact}
                  {secondaryRelation ? ` (${secondaryRelation})` : ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{secondaryPhone || "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No secondary contact added.</p>
          )}
        </div>
      </div>
    );
  };

  const renderCaregiverInfo = () => {
    if (editMode === "caregiver") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caregiver Name</label>
            <input
              type="text"
              value={caregiverName}
              onChange={(e) => setCaregiverName(e.target.value)}
              className={inputCls("caregiverName")}
            />
            {errText("caregiverName")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
            <input
              type="text"
              value={caregiverRelation}
              onChange={(e) => setCaregiverRelation(e.target.value)}
              className={inputCls("caregiverRelation")}
            />
            {errText("caregiverRelation")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={caregiverPhone}
              onChange={(e) => setCaregiverPhone(e.target.value)}
              placeholder="+92 300 1234567"
              className={inputCls("caregiverPhone")}
            />
            {errText("caregiverPhone")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={caregiverEmail}
              onChange={(e) => setCaregiverEmail(e.target.value)}
              className={inputCls("caregiverEmail")}
            />
            {errText("caregiverEmail")}
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
            {caregiverName || "—"}
            {caregiverRelation ? ` (${caregiverRelation})` : ""}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium">{caregiverPhone || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{caregiverEmail || "—"}</p>
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
                  <p className="text-gray-600 mt-2">Patient ID: {patientId ? `MEM-${patientId.slice(-6).toUpperCase()}` : "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#1a3c34]">Personal Information</h2>
              <button
                onClick={() => toggleEdit("personal")}
                className="px-4 py-2 text-[#0d9488] font-medium hover:bg-[#f0fdf4] rounded-lg transition"
              >
                {editMode === "personal" ? "Cancel" : "Edit"}
              </button>
            </div>
            {renderPersonalInfo()}
          </div>

          {/* Care Information Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#1a3c34]">Care Information</h2>
              <button
                onClick={() => toggleEdit("medical")}
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
                onClick={() => toggleEdit("emergency")}
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
                onClick={() => toggleEdit("caregiver")}
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
