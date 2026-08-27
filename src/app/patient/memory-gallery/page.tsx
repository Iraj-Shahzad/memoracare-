/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

/**
 * PATIENT MEMORY GALLERY — photos of people, places and moments, to jog memory.
 * Grid of memory cards, an "Add memory" modal, a preview modal, and read-aloud.
 *
 * Key concepts: adding a memory uploads an image via FormData (multipart —
 * JSON can't carry a file); a validation CHAIN blocks incomplete/future-dated
 * entries before saving; the "people" picker reuses names from Face Recognition
 * (two modules feeding each other) plus a free-text "Other"; delete asks with an
 * in-site confirm then optimistically removes from the list; read-aloud uses the
 * Web Speech API; images load from the backend via API_HOST + imageUrl.
 * Viva line: "Multipart upload with a full client-side validation chain, and it
 * integrates the enrolled face names so the two features connect."
 */

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiDelete, api } from "@/lib/api";
import { speak, getLang } from "@/lib/speech";
import { useUI } from "@/components/ui/UIProvider";

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

// Upload + field limits, kept in step with what the server accepts (8MB, image types).
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_TITLE = 100;
const MAX_LOCATION = 100;
const MAX_DESC = 1000;
const MAX_PERSON = 60;

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #0d9488, #1a3c34)",
  "linear-gradient(135deg, #3b82f6, #1e40af)",
  "linear-gradient(135deg, #8b5cf6, #5b21b6)",
  "linear-gradient(135deg, #ec4899, #9d174d)",
  "linear-gradient(135deg, #f59e0b, #b45309)",
];

export default function MemoryGalleryPage() {
  const { user } = useAuth();
  const { confirm } = useUI();
  const patientId = (user?.profile as any)?._id || user?.id;

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", location: "", date: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [detailMemory, setDetailMemory] = useState<Memory | null>(null);

  // People picker: known faces as options + an "Other" free-text entry.
  const [knownPeople, setKnownPeople] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [otherPerson, setOtherPerson] = useState("");
  // Full enrolled faces (photo + name + relationship) to show as "People you know".
  const [knownFaces, setKnownFaces] = useState<{ _id: string; name: string; relationship?: string; imageUrl?: string }[]>([]);
  // Per-person photo lightbox: ALL of that person's images (reference + every scan), browsable with Next/Prev.
  const [gallery, setGallery] = useState<{ name: string; relationship?: string; images: string[]; index: number } | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);

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

  const fetchPeople = async () => {
    if (!patientId) return;
    try {
      const res = await apiGet(`/face-recognition/patient/${patientId}/known-faces`).catch(() => null);
      const faces = Array.isArray(res?.knownFaces) ? res.knownFaces : [];
      setKnownFaces(faces);
      setKnownPeople(faces.map((f: any) => f.name).filter(Boolean));
    } catch { /* people list stays empty */ }
  };

  // Open a person's full photo set: their enrolment photo + every recognition scan.
  const openPersonGallery = async (f: { _id: string; name: string; relationship?: string; imageUrl?: string }) => {
    setGalleryLoading(true);
    setGallery({ name: f.name, relationship: f.relationship, images: [], index: 0 });
    const imgs: string[] = [];
    if (f.imageUrl) imgs.push(`${API_HOST}${f.imageUrl}`);
    try {
      const res = await apiGet(`/face-recognition/patient/${patientId}/logs?knownFace=${f._id}&limit=100`).catch(() => null);
      const logs = Array.isArray(res?.logs) ? res.logs : [];
      logs.forEach((l: any) => { if (l.imageUrl) imgs.push(`${API_HOST}${l.imageUrl}`); });
    } catch { /* fall back to just the reference photo */ }
    const uniq = Array.from(new Set(imgs));
    setGallery({ name: f.name, relationship: f.relationship, images: uniq, index: 0 });
    setGalleryLoading(false);
  };

  const galleryStep = (dir: 1 | -1) =>
    setGallery((g) => (g && g.images.length ? { ...g, index: (g.index + dir + g.images.length) % g.images.length } : g));

  // Keyboard nav for the person lightbox (← → to browse, Esc to close).
  useEffect(() => {
    if (!gallery) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGallery(null);
      else if (e.key === "ArrowRight") galleryStep(1);
      else if (e.key === "ArrowLeft") galleryStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery]);

  useEffect(() => {
    fetchMemories();
    fetchPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const resetForm = () => {
    setForm({ title: "", location: "", date: "", description: "" });
    setFile(null);
    setSelectedPeople([]);
    setOtherPerson("");
    setError("");
  };

  const togglePerson = (name: string) => {
    setSelectedPeople((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  };

  const handleSave = async () => {
    // ---- Validation ----
    const people = [...selectedPeople, ...otherPerson.split(",").map((p) => p.trim()).filter(Boolean)];
    if (form.title.trim().length < 3) { setError("Please give this memory a clear title (at least 3 characters)."); return; }
    if (form.title.trim().length > MAX_TITLE) { setError(`The title must be ${MAX_TITLE} characters or fewer.`); return; }
    if (!file) { setError("Please choose a photo for this memory."); return; }
    // Match the server's upload rules so a bad photo is caught before the upload starts.
    if (!ALLOWED_TYPES.includes(file.type)) { setError("Please choose a JPG, PNG, or WebP photo."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError(`That photo is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Please choose one under 8MB.`); return; }
    if (!form.location.trim()) { setError("Please enter the place."); return; }
    if (form.location.trim().length > MAX_LOCATION) { setError(`The place must be ${MAX_LOCATION} characters or fewer.`); return; }
    if (!form.date) { setError("Please pick the date of this memory."); return; }
    if (new Date(form.date) > new Date()) { setError("The date can't be in the future."); return; }
    if (new Date(form.date) < new Date("1900-01-01")) { setError("Please pick a date after 1900."); return; }
    if (form.description.trim().length < 3) { setError("Please add a short description."); return; }
    if (form.description.trim().length > MAX_DESC) { setError(`The description must be ${MAX_DESC} characters or fewer.`); return; }
    if (people.length === 0) { setError("Add at least one person (pick from the list or type a name)."); return; }
    if (people.some((p) => p.length > MAX_PERSON)) { setError(`Each name must be ${MAX_PERSON} characters or fewer.`); return; }

    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("patientId", patientId);
      fd.append("title", form.title.trim());
      fd.append("people", people.join(", "));
      fd.append("location", form.location.trim());
      fd.append("date", form.date);
      fd.append("description", form.description.trim());
      fd.append("image", file);

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
    if (!(await confirm({ message: "Remove this memory?", danger: true, confirmText: "Remove" }))) return;
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
            {/* People you know — the enrolled faces from Face Recognition (real data). */}
            {knownFaces.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h2 className="text-base font-bold text-[#1a3c34] mb-3">People you know</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>
                  {knownFaces.map((f) => (
                    <div key={f._id}
                      onClick={() => openPersonGallery(f)}
                      className="bg-white rounded-2xl overflow-hidden border border-slate-200 text-center hover:shadow-lg transition-shadow"
                      style={{ cursor: "pointer" }}
                      title="Click to see all photos">
                      {f.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${API_HOST}${f.imageUrl}`} alt={f.name}
                          style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      ) : (
                        <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#e0f2f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#0d9488" }}>
                          {(f.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ padding: "8px 6px" }}>
                        <div className="text-sm font-semibold text-[#1a3c34]" style={{ textTransform: "capitalize" }}>{f.name}</div>
                        <div className="text-xs text-[#64748b]" style={{ textTransform: "capitalize" }}>{f.relationship || "Known face"}</div>
                        <div className="text-[11px] font-semibold text-[#0d9488] mt-1">See all photos &rsaquo;</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    onClick={() => setDetailMemory(m)}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow cursor-pointer"
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
                        onClick={(e) => { e.stopPropagation(); handleDelete(m._id); }}
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

        {/* People-you-know photo lightbox — browse ALL of a person's photos with Next/Prev */}
        {gallery && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,0.9)" }} onClick={() => setGallery(null)}>
            <button onClick={() => setGallery(null)} aria-label="Close"
              className="absolute top-4 right-5 text-white text-3xl leading-none hover:text-slate-300">×</button>

            <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center" style={{ gap: 14, maxWidth: "96%", maxHeight: "94%" }}>
              {/* Person name + relationship */}
              <div className="text-center text-white">
                <div className="text-lg font-bold" style={{ textTransform: "capitalize" }}>{gallery.name}</div>
                {gallery.relationship && <div className="text-sm" style={{ color: "#cbd5e1", textTransform: "capitalize" }}>{gallery.relationship}</div>}
              </div>

              {galleryLoading ? (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin my-10" />
              ) : gallery.images.length === 0 ? (
                <div className="text-white text-sm my-10">No photos saved for this person yet.</div>
              ) : (
                <>
                  <div className="relative flex items-center justify-center">
                    {gallery.images.length > 1 && (
                      <button onClick={() => galleryStep(-1)} aria-label="Previous"
                        className="absolute -left-3 sm:-left-14 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center backdrop-blur">‹</button>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gallery.images[gallery.index]} alt={gallery.name}
                      style={{ maxWidth: "82vw", maxHeight: "72vh", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
                      onError={(e) => { e.currentTarget.style.opacity = "0.3"; }} />
                    {gallery.images.length > 1 && (
                      <button onClick={() => galleryStep(1)} aria-label="Next"
                        className="absolute -right-3 sm:-right-14 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center backdrop-blur">›</button>
                    )}
                  </div>
                  <div className="text-white text-[13px]" style={{ color: "#cbd5e1" }}>
                    {gallery.index + 1} / {gallery.images.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {detailMemory && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.5)" }} onClick={() => setDetailMemory(null)}>
            <div className="bg-white rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div style={{ height: 260, position: "relative" }}>
                {detailMemory.imageUrl ? (
                  <img src={`${API_HOST}${detailMemory.imageUrl}`} alt={detailMemory.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: CARD_GRADIENTS[0], display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ width: 56, height: 56, opacity: 0.85 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  </div>
                )}
                <button onClick={() => setDetailMemory(null)} className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-black/45 text-white flex items-center justify-center hover:bg-black/60 text-xl leading-none">×</button>
              </div>
              <div style={{ padding: 24 }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#1a3c34]">{detailMemory.title}</h2>
                    {(detailMemory.location || detailMemory.date) && (
                      <p className="text-[13px] text-[#94a3b8] mt-1">{[detailMemory.location, fmtDate(detailMemory.date)].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  <button
                    title="Read aloud"
                    onClick={() => speak(`${detailMemory.title}. ${detailMemory.description || ""}. ${detailMemory.people?.length ? "With " + detailMemory.people.join(", ") : ""}`, getLang())}
                    className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center hover:border-[#0d9488] flex-shrink-0"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" className="w-5 h-5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /><path d="M19.07 4.93a10 10 0 010 14.14" /></svg>
                  </button>
                </div>
                {detailMemory.description && <p className="text-[14px] text-[#475569] mt-3 leading-relaxed">{detailMemory.description}</p>}
                {detailMemory.people && detailMemory.people.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {detailMemory.people.map((p, i) => (
                      <span key={i} className="text-[12px] font-semibold text-[#0b6f66] bg-[#d6f0ea] rounded-full px-3 py-1">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                    maxLength={MAX_TITLE}
                    placeholder="e.g. Eid with the family"
                    className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488]"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#1a3c34]">Photo <span className="text-red-500">*</span></span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const picked = e.target.files?.[0] || null;
                      // Tell the patient straight away, instead of failing after the upload.
                      if (picked && !ALLOWED_TYPES.includes(picked.type)) {
                        setError("Please choose a JPG, PNG, or WebP photo.");
                        setFile(null); e.target.value = ""; return;
                      }
                      if (picked && picked.size > MAX_IMAGE_BYTES) {
                        setError(`That photo is ${(picked.size / (1024 * 1024)).toFixed(1)}MB. Please choose one under 8MB.`);
                        setFile(null); e.target.value = ""; return;
                      }
                      setError("");
                      setFile(picked);
                    }}
                    className="text-sm text-[#64748b] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#d6f0ea] file:text-[#0b6f66] hover:file:bg-[#c3e9e0]"
                  />
                  {file && <span className="text-[12px] text-[#0b6f66]">Selected: {file.name}</span>}
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#1a3c34]">People in this memory <span className="text-red-500">*</span></span>
                  {knownPeople.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {knownPeople.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => togglePerson(name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedPeople.includes(name) ? "bg-[#0d9488] text-white border-[#0d9488]" : "bg-white text-slate-600 border-slate-300 hover:border-[#0d9488]"}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    value={otherPerson}
                    onChange={(e) => setOtherPerson(e.target.value)}
                    maxLength={300}
                    placeholder={knownPeople.length ? "Other (type a name, or comma-separate)" : "Type names, comma-separated"}
                    className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488]"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-[#1a3c34]">Place <span className="text-red-500">*</span></span>
                    <input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      maxLength={MAX_LOCATION}
                      placeholder="e.g. Islamabad"
                      className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488]"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-[#1a3c34]">Date <span className="text-red-500">*</span></span>
                    <input
                      type="date"
                      value={form.date}
                      min="1900-01-01"
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="border border-slate-300 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-[#0d9488]"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#1a3c34]">Description <span className="text-red-500">*</span></span>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={MAX_DESC}
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
