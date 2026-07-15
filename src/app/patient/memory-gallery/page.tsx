/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiDelete, api } from "@/lib/api";

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

interface Memory {
  _id: string;
  title: string;
  imageUrl?: string;
  people?: string[];
  location?: string;
  date?: string;
  description?: string;
}

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #0d9488, #1a3c34)",
  "linear-gradient(135deg, #3b82f6, #1e40af)",
  "linear-gradient(135deg, #8b5cf6, #5b21b6)",
  "linear-gradient(135deg, #ec4899, #9d174d)",
  "linear-gradient(135deg, #f59e0b, #b45309)",
];

export default function MemoryGalleryPage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", people: "", location: "", date: "", description: "" });
  const [file, setFile] = useState<File | null>(null);

  const fetchMemories = async () => {
    if (!patientId) return;
    try {
      const res = await apiGet(`/memories/patient/${patientId}`).catch(() => null);
      if (Array.isArray(res?.memories)) setMemories(res.memories);
    } catch (err) {
      console.error("Memories fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const resetForm = () => {
    setForm({ title: "", people: "", location: "", date: "", description: "" });
    setFile(null);
    setError("");
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Please give this memory a title.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("patientId", patientId);
      fd.append("title", form.title.trim());
      if (form.people.trim()) fd.append("people", form.people.trim());
      if (form.location.trim()) fd.append("location", form.location.trim());
      if (form.date) fd.append("date", form.date);
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (file) fd.append("image", file);

      await api("/memories", { method: "POST", body: fd, isFormData: true });
      setShowModal(false);
      resetForm();
      fetchMemories();
    } catch (err: any) {
      setError(err?.message || "Could not save this memory. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this memory?")) return;
    try {
      await apiDelete(`/memories/${id}`);
      setMemories((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error("Delete memory error:", err);
    }
  };

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
      <div className="flex min-h-screen" style={{ background: "#f5f6f5" }}>
        <PatientSidebar />

        <div className="flex-1 ml-0 md:ml-[260px] flex flex-col min-h-screen">
          <Topbar
            title="Memory Gallery"
            subtitle="Photos of the people, places, and moments that matter"
            showAddButton={{ label: "Add Memory", onClick: () => { resetForm(); setShowModal(true); } }}
          />

          <div style={{ padding: "24px 32px", flex: 1 }}>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24">
                <div className="w-20 h-20 rounded-2xl bg-[#e0f2f0] flex items-center justify-center mb-5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" className="w-10 h-10">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[#1a3c34] mb-1">No memories yet</h3>
                <p className="text-[#64748b] mb-6 max-w-md">
                  Add photos of family, friends, and special places to help remember the people and moments that matter most.
                </p>
                <button
                  onClick={() => { resetForm(); setShowModal(true); }}
                  className="px-6 py-3 bg-[#0d9488] text-white rounded-[10px] text-sm font-semibold hover:bg-[#0f766e] transition-colors"
                >
                  Add your first memory
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 20,
                }}
              >
                {memories.map((m, idx) => (
                  <div
                    key={m._id}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow"
                  >
                    {/* Photo */}
                    <div style={{ height: 180, position: "relative" }}>
                      {m.imageUrl ? (
                        <img
                          src={`${API_HOST}${m.imageUrl}`}
                          alt={m.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: CARD_GRADIENTS[idx % CARD_GRADIENTS.length],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" style={{ width: 48, height: 48, opacity: 0.85 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                      <button
                        onClick={() => handleDelete(m._id)}
                        title="Remove memory"
                        className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: 16 }}>
                      <h3 className="text-[15px] font-bold text-[#1a3c34] leading-snug">{m.title}</h3>
                      {(m.location || m.date) && (
                        <p className="text-[12px] text-[#94a3b8] mt-1">
                          {[m.location, fmtDate(m.date)].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {m.description && (
                        <p className="text-[13px] text-[#64748b] mt-2 leading-relaxed">{m.description}</p>
                      )}
                      {m.people && m.people.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {m.people.map((p, i) => (
                            <span key={i} className="text-[11px] font-semibold text-[#0b6f66] bg-[#d6f0ea] rounded-full px-2.5 py-1">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Memory Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.5)" }}
            onClick={() => !saving && setShowModal(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-[#1a3c34]">Add a memory</h2>
                <button onClick={() => !saving && setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
              </div>

              <div className="px-6 py-5 flex flex-col gap-4">
                {error && (
                  <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
                )}

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#1a3c34]">Title <span className="text-red-500">*</span></span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Eid with the family"
                    className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488]"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#1a3c34]">Photo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-sm text-[#64748b] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#d6f0ea] file:text-[#0b6f66] hover:file:bg-[#c3e9e0]"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#1a3c34]">People in this memory</span>
                  <input
                    value={form.people}
                    onChange={(e) => setForm({ ...form, people: e.target.value })}
                    placeholder="Separate names with commas, e.g. Bilal, Aisha"
                    className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488]"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-[#1a3c34]">Place</span>
                    <input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Islamabad"
                      className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488]"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-[#1a3c34]">Date</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488]"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#1a3c34]">Description</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="A short note about this memory…"
                    rows={3}
                    className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488] resize-none"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
                <button
                  onClick={() => !saving && setShowModal(false)}
                  className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-[#1a3c34] bg-[#f1f5f9] hover:bg-[#e2e8f0]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save memory"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
