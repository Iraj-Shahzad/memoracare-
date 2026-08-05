/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

/**
 * PATIENT FACE RECOGNITION — helps the patient identify familiar people. All
 * matching runs IN THE BROWSER with face-api.js (privacy: the photo isn't sent
 * away to be identified). Enroll a known face, then Capture/upload to recognize.
 *
 * Key concepts: each face becomes a 128-number DESCRIPTOR (embedding); a live
 * face is matched by nearest EUCLIDEAN DISTANCE against enrolled descriptors,
 * accepted only under a 0.6 threshold; getUserMedia gives the webcam stream;
 * captureFrameBlob draws the video onto a canvas -> JPEG so the real photo is
 * saved (FormData multipart) alongside the descriptor; enrolment averages 5
 * frames (getAveragedDescriptor) to cancel per-frame noise; each person's scans
 * build a per-person image gallery (RecognitionLog stores a knownFace ref).
 * NOTE: needs the model files in /public/models (git-ignored) or nothing loads.
 * Viva line: "Browser-side face-api: 128-dim embeddings, nearest-neighbour by
 * euclidean distance, 5-frame averaged enrolment for stability."
 */

import { useState, useEffect, useRef } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete, api } from "@/lib/api";
import { loadFaceApi, getDescriptor, getAveragedDescriptor, findBestMatch, type KnownFaceLite } from "@/lib/faceApi";
import { speak, getLang } from "@/lib/speech";
import { useUI } from "@/components/ui/UIProvider";

// Backend origin (without the trailing /api) so we can load uploaded face images.
const API_HOST = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
// Turn a stored "/uploads/faces/x.jpg" into a full URL the browser can load.
const imgUrl = (u?: string | null) => (!u ? "" : /^https?:\/\//i.test(u) ? u : `${API_HOST}${u}`);
// POST multipart form data (image + fields) through the shared api() helper.
const apiForm = (endpoint: string, form: FormData) =>
  api(endpoint, { method: "POST", body: form, isFormData: true });

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

// Avatar that shows the real enrolled/scanned photo when we have one, and falls
// back to coloured initials otherwise (also if the image fails to load).
function FaceAvatar({
  imageUrl, initials, gradient, size, radius, fontSize,
}: { imageUrl?: string; initials: string; gradient: string; size: number; radius: number; fontSize: number }) {
  return (
    <div
      style={{
        position: "relative", width: size, height: size, borderRadius: radius, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize, background: gradient, overflow: "hidden",
      }}
    >
      <span>{initials}</span>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl(imageUrl)}
          alt={initials}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.currentTarget.remove(); }}
        />
      ) : null}
    </div>
  );
}

export default function FaceRecognitionPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
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
  const [manageFace, setManageFace] = useState<{ id: string; name: string; relation: string; scans: number; imageUrl?: string; gradient?: string } | null>(null);
  // All scan photos this person has appeared in (per-person recognition gallery).
  const [managePhotos, setManagePhotos] = useState<string[]>([]);
  const [managePhotosLoading, setManagePhotosLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", relationship: "" });
  const [addSaving, setAddSaving] = useState(false);
  // Descriptor + the actual image captured from the camera (enroll-on-unknown)
  // or a picked photo — so we can store a real face photo, not just the numbers.
  const pendingDescriptorRef = useRef<number[] | null>(null);
  const pendingImageRef = useRef<Blob | null>(null);

  // Grab the current webcam frame as a JPEG blob (the real captured photo).
  const captureFrameBlob = async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
  };

  // Record a recognition result, attaching the captured photo when we have one.
  const logRecognition = async (opts: {
    result: "recognized" | "unknown";
    name?: string;
    relationship?: string;
    confidence?: number;
    knownFaceId?: string;
    image?: Blob | null;
  }) => {
    try {
      const fd = new FormData();
      fd.append("patientId", patientId);
      fd.append("result", opts.result);
      if (opts.confidence != null) fd.append("confidence", String(opts.confidence));
      if (opts.result === "recognized") {
        if (opts.name) fd.append("name", opts.name);
        if (opts.relationship) fd.append("relationship", opts.relationship);
        if (opts.knownFaceId) fd.append("knownFaceId", opts.knownFaceId);
      }
      if (opts.image) fd.append("image", opts.image, `scan_${Date.now()}.jpg`);
      await apiForm("/face-recognition/recognize", fd);
    } catch {
      /* logging is best-effort; never block the UI */
    }
  };

  const [recentRecognitions, setRecentRecognitions] = useState<
    { name: string; initials: string; relation: string; time: string; confidence: number; confidenceLevel: "high" | "medium"; gradient: string; imageUrl?: string }[]
  >([]);
  const [knownFaces, setKnownFaces] = useState<
    { id: string; name: string; initials: string; relation: string; scans: number; gradient: string; imageUrl?: string }[]
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
            imageUrl: f.imageUrl || "",
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
              imageUrl: log.imageUrl || "",
            };
          })
        );
      }
    } catch (err) {
      console.error("Logs fetch error:", err);
    }
  };

  // Initialise: load the face-api models, start the webcam, load data.
  // Load data + face-api models. (Camera is started separately, below, so it
  // only attaches once the <video> element is actually on screen.)
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchKnownFaces(), fetchLogs()]);
      if (!cancelled) setLoading(false);
      try {
        await loadFaceApi();
        if (!cancelled) setModelStatus("ready");
      } catch (err) {
        console.error("Model load error:", err);
        if (!cancelled) setModelStatus("error");
      }
    };
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Start the webcam only AFTER loading is done (so the <video> is mounted) and
  // the models are ready. Attaching a stream to a not-yet-rendered <video> was
  // silently leaving the camera inactive. Camera failures now surface as toasts
  // (the #1 real cause is opening the app on a LAN IP over http — browsers only
  // allow the camera on localhost or HTTPS).
  useEffect(() => {
    if (loading || modelStatus !== "ready" || cameraActive) return;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          toast("This browser can't access the camera here. Use Chrome on localhost or an HTTPS URL.", "error");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        streamRef.current = stream;
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraActive(true);
        }
      } catch (err: unknown) {
        console.error("Camera error:", err);
        const name = (err as { name?: string })?.name || "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          toast("Camera access is blocked. Allow the camera for this site (address-bar icon) and reload.", "error");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          toast("No camera was found on this device.", "error");
        } else {
          toast("Could not start the camera. If you're not on localhost, the browser blocks it unless the site is HTTPS.", "error");
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, modelStatus, cameraActive, facingMode]);

  // Stop the camera when leaving the page.
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // Switch-camera only makes sense on phones (front/back). Hidden on desktop.
  useEffect(() => {
    setIsMobile(typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // When a known face is opened, load every scan photo they appear in.
  useEffect(() => {
    if (!manageFace || !patientId) { setManagePhotos([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setManagePhotosLoading(true);
        const res = await apiGet(`/face-recognition/patient/${patientId}/logs?knownFace=${manageFace.id}&limit=50`).catch(() => null);
        const logs = Array.isArray(res?.logs) ? res.logs : [];
        const photos: string[] = logs.map((l: any) => l.imageUrl).filter(Boolean);
        // Show the enrolment photo first if we have one.
        if (manageFace.imageUrl && !photos.includes(manageFace.imageUrl)) photos.unshift(manageFace.imageUrl);
        if (!cancelled) setManagePhotos(photos);
      } finally {
        if (!cancelled) setManagePhotosLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageFace, patientId]);

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
    if (scanning) return;
    if (modelStatus === "loading") { toast("The face model is still loading. Please wait a moment.", "info"); return; }
    if (modelStatus === "error") { toast("The face model failed to load. Check that the model files are in public/models.", "error"); return; }
    if (!videoRef.current || !cameraActive) { toast("Camera is not active. Please allow camera access and try again.", "error"); return; }
    setScanning(true);
    setResult(null);
    try {
      const probe = await getDescriptor(videoRef.current);
      if (!probe) {
        setResult({ name: "No face detected", relationship: "Please look at the camera", initials: "!", confidence: 0, unknown: true });
        speak(getLang() === "ur" ? "کوئی چہرہ نظر نہیں آیا۔ براہ کرم کیمرے کی طرف دیکھیں۔" : "No face detected. Please look at the camera.", getLang());
        return;
      }

      // Keep this descriptor + the actual captured frame so an unknown face can be
      // enrolled ("Add this person") and every scan is logged with its real photo.
      pendingDescriptorRef.current = Array.from(probe);
      const frame = await captureFrameBlob();
      pendingImageRef.current = frame;
      const match = findBestMatch(probe, knownRef.current);
      if (match) {
        setResult({ name: match.name, relationship: match.relationship || "Recognized", initials: toInitials(match.name), confidence: match.confidence, unknown: false });
        announceFace(match.name, match.relationship, false);
        await logRecognition({ result: "recognized", name: match.name, relationship: match.relationship, confidence: match.confidence, knownFaceId: match.knownFaceId, image: frame });
      } else {
        setResult({ name: "Unknown Person", relationship: "Not in your known faces", initials: "?", confidence: 0, unknown: true });
        announceFace("", "", true);
        await logRecognition({ result: "unknown", confidence: 0, image: frame });
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
    if (modelStatus !== "ready") { toast("The face model is still loading. Please wait a moment and try again.", "info"); return; }
    pendingDescriptorRef.current = null;
    fileInputRef.current?.click();
  };
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const d = await computeDescriptorFromFile(file);
      if (!d) { toast("Couldn't find a clear face in that photo. Try a well-lit, front-facing one.", "error"); return; }
      pendingDescriptorRef.current = Array.from(d);
      pendingImageRef.current = file; // keep the real photo to store on the profile
      setAddForm({ name: "", relationship: "" });
      setShowAdd(true);
    } catch { toast("Could not read that photo.", "error"); }
  };

  // "Add this person" on an unknown capture → enroll using the live camera.
  // We re-scan with an AVERAGED descriptor (multiple frames) for a much stronger
  // template, and grab a fresh photo, before showing the name form.
  const [enrollPrepping, setEnrollPrepping] = useState(false);
  const enrollFromCapture = async () => {
    if (modelStatus !== "ready") { toast("The face model is still loading. Please wait a moment.", "info"); return; }
    try {
      setEnrollPrepping(true);
      if (videoRef.current && cameraActive) {
        const avg = await getAveragedDescriptor(videoRef.current, 5);
        if (avg) pendingDescriptorRef.current = Array.from(avg);
        const frame = await captureFrameBlob();
        if (frame) pendingImageRef.current = frame;
      }
      if (!pendingDescriptorRef.current) { toast("Please capture a clear face first.", "info"); return; }
      setAddForm({ name: "", relationship: "" });
      setShowAdd(true);
    } finally {
      setEnrollPrepping(false);
    }
  };

  const submitAddFace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDescriptorRef.current) { toast("No face captured. Please try again.", "error"); return; }
    if (addForm.name.trim().length < 2) { toast("Please enter the person's name.", "info"); return; }
    try {
      setAddSaving(true);
      const fd = new FormData();
      fd.append("patientId", patientId);
      fd.append("name", addForm.name.trim());
      fd.append("relationship", addForm.relationship.trim());
      fd.append("descriptor", JSON.stringify(pendingDescriptorRef.current));
      if (pendingImageRef.current) fd.append("image", pendingImageRef.current, `face_${Date.now()}.jpg`);
      await apiForm("/face-recognition/known-faces", fd);
      setShowAdd(false);
      pendingDescriptorRef.current = null;
      pendingImageRef.current = null;
      setResult(null);
      toast("Face added successfully.", "success");
      await fetchKnownFaces();
    } catch (err) { toast(err instanceof Error ? err.message : "Could not add this face.", "error"); }
    finally { setAddSaving(false); }
  };

  // Gallery → recognise a face from a chosen photo.
  const handleGallery = () => {
    if (modelStatus !== "ready") { toast("The face model is still loading. Please wait a moment and try again.", "info"); return; }
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
      pendingImageRef.current = file;
      const match = findBestMatch(d, knownRef.current);
      if (match) {
        setResult({ name: match.name, relationship: match.relationship || "Recognized", initials: toInitials(match.name), confidence: match.confidence, unknown: false });
        announceFace(match.name, match.relationship, false);
        await logRecognition({ result: "recognized", name: match.name, relationship: match.relationship, confidence: match.confidence, knownFaceId: match.knownFaceId, image: file });
      } else {
        setResult({ name: "Unknown Person", relationship: "Not in your known faces", initials: "?", confidence: 0, unknown: true });
        announceFace("", "", true);
        await logRecognition({ result: "unknown", confidence: 0, image: file });
      }
      fetchLogs();
    } catch { setResult(null); }
    finally { setScanning(false); }
  };

  const handleDeleteFace = async (id: string) => {
    if (!(await confirm({ message: "Remove this person from known faces?", danger: true, confirmText: "Remove" }))) return;
    try {
      await apiDelete(`/face-recognition/known-faces/${id}`);
      setManageFace(null);
      await fetchKnownFaces();
    } catch (err) { toast(err instanceof Error ? err.message : "Could not delete this face.", "error"); }
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
                          disabled={enrollPrepping}
                          style={{ padding: "10px 20px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: enrollPrepping ? "default" : "pointer", border: "none", background: "#0d9488", color: "#fff", opacity: enrollPrepping ? 0.6 : 1 }}
                        >
                          {enrollPrepping ? "Reading face…" : "Add this person"}
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
                  <FaceAvatar imageUrl={rec.imageUrl} initials={rec.initials} gradient={rec.gradient} size={48} radius={12} fontSize={16} />
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
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <FaceAvatar imageUrl={face.imageUrl} initials={face.initials} gradient={face.gradient} size={64} radius={16} fontSize={22} />
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
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 380, maxHeight: "85vh", overflowY: "auto", padding: 24, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <FaceAvatar imageUrl={manageFace.imageUrl} initials={toInitials(manageFace.name)} gradient={manageFace.gradient || "linear-gradient(135deg,#0d9488,#1a3c34)"} size={72} radius={16} fontSize={24} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a3c34" }}>{manageFace.name}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{manageFace.relation || "—"}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{manageFace.scans} recognitions</div>

            {/* Per-person photo gallery — every scan this person appeared in. */}
            <div style={{ marginTop: 18, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a3c34", marginBottom: 8 }}>Photos of {manageFace.name.split(" ")[0]}</div>
              {managePhotosLoading ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading photos…</p>
              ) : managePhotos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>No photos yet. Scan this person to build their gallery.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {managePhotos.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={imgUrl(src)} alt={`${manageFace.name} scan ${i + 1}`}
                      style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0" }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ))}
                </div>
              )}
            </div>

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
                <FaceAvatar imageUrl={rec.imageUrl} initials={rec.initials} gradient={rec.gradient} size={40} radius={10} fontSize={14} />
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
                <FaceAvatar imageUrl={f.imageUrl} initials={f.initials} gradient={f.gradient} size={40} radius={10} fontSize={14} />
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
