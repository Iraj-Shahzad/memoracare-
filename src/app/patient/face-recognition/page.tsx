/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete, api } from "@/lib/api";
import { loadFaceApi, getDescriptor, findBestMatch, type KnownFaceLite } from "@/lib/faceApi";
import { speak, getLang } from "@/lib/speech";

// Common relationship words in Urdu for a natural spoken announcement.
const REL_UR: Record<string, string> = {
  daughter: "بیٹی", son: "بیٹا", wife: "بیوی", husband: "شوہر",
  mother: "والدہ", father: "والد", brother: "بھائی", sister: "بہن",
  doctor: "ڈاکٹر", caregiver: "نگہداشت کنندہ", nurse: "نرس",
  neighbor: "پڑوسی", friend: "دوست", granddaughter: "پوتی", grandson: "پوتا",
};

// Speak a recognition result aloud in the current language.
function announceFace(name: string, relationship: string | undefined, unknown: boolean) {
  const lang = getLang();
  if (unknown) {
    speak(lang === "ur" ? "میں اس شخص کو نہیں پہچانتا۔" : "I don't recognize this person.", lang);
    return;
  }
  const rel = (relationship || "").trim();
  if (lang === "ur") {
    const relUr = REL_UR[rel.toLowerCase()] || rel;
    speak(`یہ ${name} ہیں${relUr ? `، آپ کے ${relUr}` : ""}۔`, lang);
  } else {
    speak(`This is ${name}${rel ? `, your ${rel}` : ""}.`, lang);
  }
}

interface RecognitionResult {
  name: string;
  relationship: string;
  initials: string;
  confidence: number;
  unknown: boolean;
}

function toInitials(name: string) {
  return (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function FaceRecognitionPage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;

  const GRADIENTS = [
    "linear-gradient(135deg, #0d9488, #1a3c34)",
    "linear-gradient(135deg, #3b82f6, #1e40af)",
    "linear-gradient(135deg, #8b5cf6, #5b21b6)",
    "linear-gradient(135deg, #ec4899, #9d174d)",
    "linear-gradient(135deg, #f59e0b, #b45309)",
  ];

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const knownRef = useRef<KnownFaceLite[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(true);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);

  // UI/UX state
  const [isMobile, setIsMobile] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showManageAll, setShowManageAll] = useState(false);
  const [manageFace, setManageFace] = useState<{ id: string; name: string; relation: string; scans: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", relationship: "" });
  const [addSaving, setAddSaving] = useState(false);
  // Descriptor captured from the camera (enroll-on-unknown) or a picked photo.
  const pendingDescriptorRef = useRef<number[] | null>(null);

  const [recentRecognitions, setRecentRecognitions] = useState<
    { name: string; initials: string; relation: string; time: string; confidence: number; confidenceLevel: "high" | "medium"; gradient: string }[]
  >([]);
  const [knownFaces, setKnownFaces] = useState<
    { id: string; name: string; initials: string; relation: string; scans: number; gradient: string }[]
  >([]);

  // Load enrolled faces from the backend (with their descriptors for matching).
  const fetchKnownFaces = async () => {
    if (!patientId) return;
    try {
      const res = await apiGet(`/face-recognition/patient/${patientId}/known-faces`).catch(() => null);
      const faces = res?.knownFaces;
      if (Array.isArray(faces)) {
        knownRef.current = faces.map((f: any) => ({
          _id: f._id,
          name: f.name,
          relationship: f.relationship,
          descriptor: f.descriptor,
        }));
        setKnownFaces(
          faces.map((f: any, i: number) => ({
            id: f._id,
            name: f.name || "Unknown",
            initials: toInitials(f.name),
            relation: f.relationship || "",
            scans: f.recognitionCount || 0,
            gradient: GRADIENTS[i % GRADIENTS.length],
          }))
        );
      }
    } catch (err) {
      console.error("Known faces fetch error:", err);
    }
  };

  // Load recent recognition logs.
  const fetchLogs = async () => {
    if (!patientId) return;
    try {
      const res = await apiGet(`/face-recognition/patient/${patientId}/logs`).catch(() => null);
      const logs = res?.logs;
      if (Array.isArray(logs)) {
        setRecentRecognitions(
          logs.slice(0, 8).map((log: any, i: number) => {
            const name = log.recognizedPerson?.name || "Unknown Person";
            const conf = Math.round((log.confidence || 0) * 1); // confidence stored as 0-100
            return {
              name,
              initials: toInitials(name),
              relation: log.recognizedPerson?.relationship || (log.result === "unknown" ? "Unrecognized" : ""),
              time: log.createdAt ? new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "",
              confidence: conf,
              confidenceLevel: conf >= 85 ? ("high" as const) : ("medium" as const),
              gradient: log.result === "unknown" ? "linear-gradient(135deg, #64748b, #334155)" : GRADIENTS[i % GRADIENTS.length],
            };
          })
        );
      }
    } catch (err) {
      console.error("Logs fetch error:", err);
    }
  };

  // Initialise: load the face-api models, start the webcam, load data.
  useEffect(() => {
    if (!patientId) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      await Promise.all([fetchKnownFaces(), fetchLogs()]);
      setLoading(false);

      try {
        await loadFaceApi();
        if (cancelled) return;
        setModelStatus("ready");
      } catch (err) {
        console.error("Model load error:", err);
        setModelStatus("error");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        streamRef.current = stream;
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    init();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Switch-camera only makes sense on phones (front/back). Hidden on desktop.
  useEffect(() => {
    setIsMobile(typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const switchCamera = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
    } catch (err) {
      console.error("Switch camera error:", err);
    }
  };

  // Capture the current frame, compute its descriptor, and match it.
  const handleCapture = async () => {
    if (!videoRef.current || modelStatus !== "ready" || scanning) return;
    setScanning(true);
    setResult(null);
    try {
      const probe = await getDescriptor(videoRef.current);
      if (!probe) {
        setResult({ name: "No face detected", relationship: "Please look at the camera", initials: "!", confidence: 0, unknown: true });
        speak(getLang() === "ur" ? "کوئی چہرہ نظر نہیں آیا۔ براہ کرم کیمرے کی طرف دیکھیں۔" : "No face detected. Please look at the camera.", getLang());
        return;
      }

      // Keep this descriptor so an unknown face can be enrolled ("Add this person").
      pendingDescriptorRef.current = Array.from(probe);
      const match = findBestMatch(probe, knownRef.current);
      if (match) {
        setResult({ name: match.name, relationship: match.relationship || "Recognized", initials: toInitials(match.name), confidence: match.confidence, unknown: false });
        announceFace(match.name, match.relationship, false);
        await apiPost("/face-recognition/recognize", {
          patientId,
          result: "recognized",
          name: match.name,
          relationship: match.relationship,
          confidence: match.confidence,
          knownFaceId: match.knownFaceId,
        }).catch(() => {});
      } else {
        setResult({ name: "Unknown Person", relationship: "Not in your known faces", initials: "?", confidence: 0, unknown: true });
        announceFace("", "", true);
        await apiPost("/face-recognition/recognize", { patientId, result: "unknown", confidence: 0 }).catch(() => {});
      }
      fetchLogs();
      fetchKnownFaces();
    } catch (err) {
      console.error("Recognition error:", err);
    } finally {
      setScanning(false);
    }
  };

  const computeDescriptorFromFile = async (file: File): Promise<Float32Array | null> => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const d = await getDescriptor(img);
    URL.revokeObjectURL(img.src);
    return d;
  };

  // Add New Face → pick a photo, then a small name/relationship form (no prompts).
  const handleAddFace = () => {
    if (modelStatus !== "ready") { window.alert("The face model is still loading. Please wait a moment and try again."); return; }
    pendingDescriptorRef.current = null;
    fileInputRef.current?.click();
  };
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const d = await computeDescriptorFromFile(file);
      if (!d) { window.alert("Couldn't find a clear face in that photo. Try a well-lit, front-facing one."); return; }
      pendingDescriptorRef.current = Array.from(d);
      setAddForm({ name: "", relationship: "" });
      setShowAdd(true);
    } catch { window.alert("Could not read that photo."); }
  };

  // "Add this person" on an unknown capture → enroll using the captured descriptor.
  const enrollFromCapture = () => {
    if (!pendingDescriptorRef.current) { window.alert("Please capture a face first."); return; }
    setAddForm({ name: "", relationship: "" });
    setShowAdd(true);
  };

  const submitAddFace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDescriptorRef.current) { window.alert("No face captured. Please try again."); return; }
    if (addForm.name.trim().length < 2) { window.alert("Please enter the person's name."); return; }
    try {
      setAddSaving(true);
      await apiPost("/face-recognition/known-faces", {
        patientId, name: addForm.name.trim(), relationship: addForm.relationship.trim(),
        descriptor: pendingDescriptorRef.current,
      });
      setShowAdd(false);
      pendingDescriptorRef.current = null;
      setResult(null);
      await fetchKnownFaces();
    } catch (err) { window.alert(err instanceof Error ? err.message : "Could not add this face."); }
    finally { setAddSaving(false); }
  };

  // Gallery → recognise a face from a chosen photo.
  const handleGallery = () => {
    if (modelStatus !== "ready") { window.alert("The face model is still loading. Please wait a moment and try again."); return; }
    galleryInputRef.current?.click();
  };
  const handleGallerySelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true); setResult(null);
    try {
      const d = await computeDescriptorFromFile(file);
      if (!d) { setResult({ name: "No face detected", relationship: "Try a clearer photo", initials: "!", confidence: 0, unknown: true }); return; }
      pendingDescriptorRef.current = Array.from(d);
      const match = findBestMatch(d, knownRef.current);
      if (match) {
        setResult({ name: match.name, relationship: match.relationship || "Recognized", initials: toInitials(match.name), confidence: match.confidence, unknown: false });
        announceFace(match.name, match.relationship, false);
        await apiPost("/face-recognition/recognize", { patientId, result: "recognized", name: match.name, relationship: match.relationship, confidence: match.confidence, knownFaceId: match.knownFaceId }).catch(() => {});
      } else {
        setResult({ name: "Unknown Person", relationship: "Not in your known faces", initials: "?", confidence: 0, unknown: true });
        announceFace("", "", true);
        await apiPost("/face-recognition/recognize", { patientId, result: "unknown", confidence: 0 }).catch(() => {});
      }
      fetchLogs();
    } catch { setResult(null); }
    finally { setScanning(false); }
  };

  const handleDeleteFace = async (id: string) => {
    if (!window.confirm("Remove this person from known faces?")) return;
    try {
      await apiDelete(`/face-recognition/known-faces/${id}`);
      setManageFace(null);
      await fetchKnownFaces();
    } catch (err) { window.alert(err instanceof Error ? err.message : "Could not delete this face."); }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex min-h-screen" style={{ background: "#f5f6f5" }}>
          <PatientSidebar />
          <div className="ml-0 md:ml-[260px] flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748b]">Loading face recognition...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
    <div className="flex min-h-screen" style={{ background: "#f5f6f5" }}>
      <PatientSidebar />

      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col min-h-screen">
        <Topbar title="Face Recognition" subtitle="Identify familiar faces with AI-powered recognition" />

        <div style={{ padding: "24px 32px", flex: 1 }}>
          {/* Camera Container */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: 20,
              overflow: "hidden",
              position: "relative",
              height: 520,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              }}
            >
              {/* Camera BG */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)",
                }}
              />

              {/* Live webcam feed */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)", // mirror like a selfie camera
                }}
              />

              {/* Hidden file input for enrolling a face from a photo */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileSelected}
                style={{ display: "none" }}
              />
              {/* Hidden file input for recognising a face from a gallery photo */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleGallerySelected}
                style={{ display: "none" }}
              />

              {/* Model-loading / camera overlay */}
              {(modelStatus !== "ready" || !cameraActive) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    color: "#fff",
                    zIndex: 5,
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <span style={{ fontSize: 14, opacity: 0.9 }}>
                    {modelStatus === "error"
                      ? "Could not load the face model. Check that model files are in /public/models."
                      : modelStatus !== "ready"
                      ? "Loading face recognition model…"
                      : "Starting camera… please allow camera access."}
                  </span>
                </div>
              )}

              {/* Scan Line */}
              {cameraActive && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background:
                      "linear-gradient(90deg, transparent, #0d9488, transparent)",
                    animation: "scan 3s ease-in-out infinite",
                  }}
                />
              )}

              {/* Face Silhouette */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <svg
                  viewBox="0 0 120 120"
                  fill="none"
                  stroke="#fff"
                  style={{ width: 120, height: 120, opacity: 0.15 }}
                >
                  <circle cx="60" cy="45" r="25" strokeWidth="2" />
                  <path
                    d="M20 110c0-22 18-40 40-40s40 18 40 40"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Face Detection Box */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -55%)",
                  width: 200,
                  height: 240,
                }}
              >
                {/* Top-left corner */}
                <div style={{ position: "absolute", top: 0, left: 0 }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: 24,
                      height: 3,
                      background: "#0d9488",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: 3,
                      height: 24,
                      background: "#0d9488",
                    }}
                  />
                </div>
                {/* Top-right corner */}
                <div style={{ position: "absolute", top: 0, right: 0 }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 24,
                      height: 3,
                      background: "#0d9488",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 3,
                      height: 24,
                      background: "#0d9488",
                    }}
                  />
                </div>
                {/* Bottom-left corner */}
                <div style={{ position: "absolute", bottom: 0, left: 0 }}>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: 24,
                      height: 3,
                      background: "#0d9488",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: 3,
                      height: 24,
                      background: "#0d9488",
                    }}
                  />
                </div>
                {/* Bottom-right corner */}
                <div style={{ position: "absolute", bottom: 0, right: 0 }}>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 24,
                      height: 3,
                      background: "#0d9488",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 3,
                      height: 24,
                      background: "#0d9488",
                    }}
                  />
                </div>
              </div>

              {/* Confidence Badge */}
              {result && !result.unknown && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(70px, -140px)",
                    background: "rgba(13, 148, 136, 0.9)",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    zIndex: 6,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 14,
                      height: 14,
                      stroke: "#fff",
                      fill: "none",
                      strokeWidth: 2,
                    }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {result.confidence}% Match
                </div>
              )}

              {/* Camera Status */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(8px)",
                  padding: "8px 16px",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: "#ef4444",
                    borderRadius: "50%",
                    animation: "pulse 1.5s infinite",
                  }}
                />
                <span>Camera Active</span>
              </div>

              {/* Camera Info Chips */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  display: "flex",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    padding: "8px 14px",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 14,
                      height: 14,
                      stroke: "#0d9488",
                      fill: "none",
                      strokeWidth: 2,
                    }}
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  1 Face Detected
                </div>
                <div
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    padding: "8px 14px",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 14,
                      height: 14,
                      stroke: "#0d9488",
                      fill: "none",
                      strokeWidth: 2,
                    }}
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Neural Embeddings
                </div>
              </div>

              {/* Camera Controls */}
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                {isMobile && (
                <button
                  title="Switch Camera"
                  onClick={switchCamera}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 22,
                      height: 22,
                      fill: "none",
                      stroke: "#fff",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    }}
                  >
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                </button>
                )}
                <button
                  onClick={handleCapture}
                  title="Capture"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    border: "4px solid #fff",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#0d9488",
                    }}
                  />
                </button>
                <button
                  title="Recognise from a photo"
                  onClick={handleGallery}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 22,
                      height: 22,
                      fill: "none",
                      stroke: "#fff",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    }}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
              </div>

              {/* Slide-up Result Panel */}
              {result && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(255,255,255,0.97)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "20px 20px 0 0",
                    padding: "24px 28px",
                    boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
                    zIndex: 7,
                  }}
                >
                  {/* Handle */}
                  <div
                    style={{
                      width: 40,
                      height: 4,
                      background: "#d1d5db",
                      borderRadius: 2,
                      margin: "0 auto 16px",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 16,
                        background: result.unknown
                          ? "linear-gradient(135deg, #64748b, #334155)"
                          : "linear-gradient(135deg, #0d9488, #1a3c34)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          color: "#fff",
                          fontSize: 24,
                          fontWeight: 800,
                        }}
                      >
                        {result.initials}
                      </span>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#1a3c34",
                        }}
                      >
                        {result.name}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: result.unknown ? "#64748b" : "#0d9488",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {result.relationship}
                      </div>
                      {!result.unknown && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            color: "#64748b",
                            marginTop: 8,
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            style={{
                              width: 14,
                              height: 14,
                              stroke: "#16a34a",
                              fill: "none",
                              strokeWidth: 2,
                            }}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {result.confidence}% confidence match
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      {result.unknown && (
                        <button
                          onClick={enrollFromCapture}
                          style={{ padding: "10px 20px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#0d9488", color: "#fff" }}
                        >
                          Add this person
                        </button>
                      )}
                      <button
                        onClick={handleCapture}
                        disabled={scanning}
                        style={{
                          padding: "10px 20px",
                          borderRadius: 10,
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: scanning ? "not-allowed" : "pointer",
                          border: "none",
                          background: "#0d9488",
                          color: "#fff",
                          opacity: scanning ? 0.6 : 1,
                        }}
                      >
                        {scanning ? "Scanning…" : "Scan Again"}
                      </button>
                      <button
                        onClick={() => setResult(null)}
                        style={{
                          padding: "10px 20px",
                          borderRadius: 10,
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "none",
                          background: "#f1f5f9",
                          color: "#1a3c34",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Recognitions */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3
                style={{ fontSize: 18, fontWeight: 700, color: "#1a3c34" }}
              >
                Recent Recognitions
              </h3>
              <button
                onClick={() => setShowAllLogs(true)}
                style={{ fontSize: 13, color: "#0d9488", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer" }}
              >
                View All
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(250px, 1fr))",
                gap: 16,
              }}
            >
              {recentRecognitions.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    padding: 16,
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontWeight: 700,
                      color: "#fff",
                      fontSize: 16,
                      background: rec.gradient,
                    }}
                  >
                    {rec.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1a3c34",
                      }}
                    >
                      {rec.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {rec.relation}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 4,
                      }}
                    >
                      {rec.time}
                    </div>
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      background:
                        rec.confidenceLevel === "high"
                          ? "#dcfce7"
                          : "#fef3c7",
                      color:
                        rec.confidenceLevel === "high"
                          ? "#16a34a"
                          : "#d97706",
                    }}
                  >
                    {rec.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Known Faces */}
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3
                style={{ fontSize: 18, fontWeight: 700, color: "#1a3c34" }}
              >
                Known Faces
              </h3>
              <button
                onClick={() => setShowManageAll(true)}
                disabled={knownFaces.length === 0}
                style={{ fontSize: 13, color: "#0d9488", fontWeight: 600, background: "transparent", border: "none", cursor: knownFaces.length ? "pointer" : "not-allowed", opacity: knownFaces.length ? 1 : 0.5 }}
              >
                Manage
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              {knownFaces.map((face, idx) => (
                <div
                  key={idx}
                  onClick={() => setManageFace(face)}
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    padding: 20,
                    border: "1px solid #e2e8f0",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      margin: "0 auto 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#fff",
                      fontSize: 22,
                      background: face.gradient,
                    }}
                  >
                    {face.initials}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1a3c34",
                    }}
                  >
                    {face.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      marginTop: 2,
                    }}
                  >
                    {face.relation}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      marginTop: 6,
                    }}
                  >
                    {face.scans} scans
                  </div>
                </div>
              ))}
              {/* Add New Face */}
              <div
                onClick={handleAddFace}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: 20,
                  border: "2px dashed #d1d5db",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: "#f1f5f9",
                    margin: "0 auto 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 28,
                      height: 28,
                      stroke: "#94a3b8",
                      fill: "none",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                    }}
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}
                >
                  Add New Face
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Face modal (name + relationship for the captured/picked face) */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a3c34", marginBottom: 16 }}>Add to Known Faces</h3>
            <form onSubmit={submitAddFace}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Name *</label>
              <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Full name" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, marginTop: 4, marginBottom: 12, fontFamily: "inherit", fontSize: 14 }} />
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Relationship</label>
              <input value={addForm.relationship} onChange={(e) => setAddForm({ ...addForm, relationship: e.target.value })} placeholder="e.g. Daughter, Doctor" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, marginTop: 4, marginBottom: 16, fontFamily: "inherit", fontSize: 14 }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={addSaving} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#0d9488", color: "#fff", fontWeight: 600, cursor: "pointer", opacity: addSaving ? 0.6 : 1 }}>{addSaving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Known-face detail + delete */}
      {manageFace && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={() => setManageFace(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 360, padding: 24, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 72, height: 72, borderRadius: 16, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 24, background: "linear-gradient(135deg,#0d9488,#1a3c34)" }}>{toInitials(manageFace.name)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a3c34" }}>{manageFace.name}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{manageFace.relation || "—"}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{manageFace.scans} recognitions</div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setManageFace(null)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" }}>Close</button>
              <button onClick={() => handleDeleteFace(manageFace.id)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* View All recognitions */}
      {showAllLogs && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={() => setShowAllLogs(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto", padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a3c34" }}>All Recognitions</h3>
              <button onClick={() => setShowAllLogs(false)} style={{ background: "transparent", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            {recentRecognitions.length === 0 ? (
              <p style={{ fontSize: 14, color: "#64748b" }}>No recognitions yet.</p>
            ) : recentRecognitions.map((rec, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, background: rec.gradient }}>{rec.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a3c34" }}>{rec.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{rec.relation} · {rec.time}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: rec.confidenceLevel === "high" ? "#16a34a" : "#d97706" }}>{rec.confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manage all known faces */}
      {showManageAll && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={() => setShowManageAll(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto", padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a3c34" }}>Manage Known Faces</h3>
              <button onClick={() => setShowManageAll(false)} style={{ background: "transparent", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            {knownFaces.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, background: f.gradient }}>{f.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a3c34" }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{f.relation || "—"} · {f.scans} scans</div>
                </div>
                <button onClick={() => handleDeleteFace(f.id)} style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", background: "transparent", border: "none", cursor: "pointer" }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 10%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 85%;
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
    </ProtectedRoute>
  );
}
