/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import Topbar from "@/components/shared/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, api } from "@/lib/api";

export default function FaceRecognitionPage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;

  const [cameraActive] = useState(true);
  const [showResult] = useState(true);
  const [loading, setLoading] = useState(true);

  const [recentRecognitions, setRecentRecognitions] = useState([
    {
      name: "Sarah Ahmed",
      initials: "SA",
      relation: "Daughter",
      time: "Today, 1:30 PM",
      confidence: 97,
      confidenceLevel: "high" as const,
      gradient: "linear-gradient(135deg, #0d9488, #1a3c34)",
    },
    {
      name: "Ali Khan",
      initials: "AK",
      relation: "Son",
      time: "Today, 11:00 AM",
      confidence: 94,
      confidenceLevel: "high" as const,
      gradient: "linear-gradient(135deg, #3b82f6, #1e40af)",
    },
    {
      name: "Dr. Amna Khalid",
      initials: "FK",
      relation: "Doctor",
      time: "Yesterday, 3:15 PM",
      confidence: 91,
      confidenceLevel: "high" as const,
      gradient: "linear-gradient(135deg, #8b5cf6, #5b21b6)",
    },
    {
      name: "Zainab Ahmed",
      initials: "ZA",
      relation: "Granddaughter",
      time: "Apr 10, 2026",
      confidence: 82,
      confidenceLevel: "medium" as const,
      gradient: "linear-gradient(135deg, #ec4899, #9d174d)",
    },
  ]);

  const [knownFaces, setKnownFaces] = useState([
    {
      name: "Sarah Ahmed",
      initials: "SA",
      relation: "Daughter",
      scans: 127,
      gradient: "linear-gradient(135deg, #0d9488, #1a3c34)",
    },
    {
      name: "Ali Khan",
      initials: "AK",
      relation: "Son",
      scans: 89,
      gradient: "linear-gradient(135deg, #3b82f6, #1e40af)",
    },
    {
      name: "Dr. Amna Khalid",
      initials: "AK",
      relation: "Doctor",
      scans: 34,
      gradient: "linear-gradient(135deg, #8b5cf6, #5b21b6)",
    },
    {
      name: "Zainab Ahmed",
      initials: "ZA",
      relation: "Granddaughter",
      scans: 56,
      gradient: "linear-gradient(135deg, #ec4899, #9d174d)",
    },
    {
      name: "Hassan Ali",
      initials: "HA",
      relation: "Neighbor",
      scans: 12,
      gradient: "linear-gradient(135deg, #f59e0b, #b45309)",
    },
  ]);

  useEffect(() => {
    if (!patientId) return;
    const fetchKnownFaces = async () => {
      try {
        setLoading(true);
        const res = await apiGet(`/face-recognition/patient/${patientId}/known-faces`).catch(() => null);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((face: any) => ({
            name: face.name || "Unknown",
            initials: (face.name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
            relation: face.relation || face.relationship || "",
            scans: face.scans || face.recognitionCount || 0,
            gradient: "linear-gradient(135deg, #0d9488, #1a3c34)",
          }));
          setKnownFaces(mapped);
        }
      } catch (err) {
        console.error("Known faces fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKnownFaces();
  }, [patientId]);

  const handleCapture = async () => {
    // In a real implementation, this would capture from the camera
    // and send to the face recognition API
    try {
      // Placeholder - would use FormData with actual image
      console.log("Capture triggered - would send to /face-recognition/recognize");
    } catch (err) {
      console.error("Face recognition error:", err);
    }
  };

  const handleAddFace = async () => {
    // In a real implementation, this would open a file picker
    // and send the image with name to the API
    try {
      console.log("Add face triggered - would send to /face-recognition/known-faces");
    } catch (err) {
      console.error("Add face error:", err);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["patient"]}>
        <div className="flex min-h-screen" style={{ background: "#f5f6f5" }}>
          <PatientSidebar />
          <div className="ml-[260px] flex-1 flex items-center justify-center">
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

      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
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
                97.4% Match
              </div>

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
                  Siamese Network
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
                <button
                  title="Switch Camera"
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
                  title="Gallery"
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
              {showResult && (
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
                        background: "linear-gradient(135deg, #0d9488, #1a3c34)",
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
                        SA
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
                        Sarah Ahmed
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#0d9488",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        Daughter - Primary Caregiver
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 20,
                          marginTop: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            style={{
                              width: 14,
                              height: 14,
                              stroke: "#94a3b8",
                              fill: "none",
                              strokeWidth: 2,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                            }}
                          >
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                          </svg>
                          +92 312 9876543
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            style={{
                              width: 14,
                              height: 14,
                              stroke: "#94a3b8",
                              fill: "none",
                              strokeWidth: 2,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                            }}
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          Islamabad
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            style={{
                              width: 14,
                              height: 14,
                              stroke: "#94a3b8",
                              fill: "none",
                              strokeWidth: 2,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                            }}
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Last seen: 2 hours ago
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        style={{
                          padding: "10px 20px",
                          borderRadius: 10,
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "none",
                          background: "#0d9488",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          style={{
                            width: 16,
                            height: 16,
                            fill: "none",
                            stroke: "#fff",
                            strokeWidth: 2,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                          }}
                        >
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                        </svg>
                        Call
                      </button>
                      <button
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
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          style={{
                            width: 16,
                            height: 16,
                            fill: "none",
                            stroke: "#1a3c34",
                            strokeWidth: 2,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                          }}
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        More Info
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
              <a
                href="#"
                style={{
                  fontSize: 13,
                  color: "#0d9488",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                View All
              </a>
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
              <a
                href="#"
                style={{
                  fontSize: 13,
                  color: "#0d9488",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Manage
              </a>
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
