"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Logo from "@/components/icons/Logo";
import { apiPut } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = Array.isArray(params?.token) ? params.token[0] : (params?.token as string);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiPut(`/auth/reset-password/${token}`, { password });
      setDone(true);
      // Send them to sign in after a short beat.
      setTimeout(() => router.push("/auth"), 2200);
    } catch (err: unknown) {
      setError((err as Error).message || "This reset link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(160deg,#1a3c34 0%,#0f2b25 100%)", padding: 24 }}>
      <div className="w-full" style={{ maxWidth: 440 }}>
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <Logo className="w-[42px] h-[42px]" />
          <span className="text-white text-[22px] font-bold">
            Memory<span className="text-[#5eead4]">Care</span>
          </span>
        </Link>

        <div className="bg-white" style={{ borderRadius: 18, padding: 36, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
          {!done ? (
            <>
              <h1 className="text-[26px] font-extrabold mb-2" style={{ color: "#1a3c34" }}>Set a new password</h1>
              <p className="text-[15px] mb-7" style={{ color: "#64748b" }}>
                Choose a new password for your account. Make it at least 6 characters.
              </p>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="flex items-center gap-2 mb-5 text-[13px] font-medium" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: 10 }}>
                    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                )}

                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>New Password</label>
                <div className="relative mb-5">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full outline-none transition-all"
                    style={{ padding: "12px 16px", paddingRight: 48, border: "1.5px solid #d1d5db", borderRadius: 12, fontSize: 15, color: "#1a3c34", background: "#f9fafb" }}
                    onFocus={(e) => { e.target.style.borderColor = "#0d9488"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.background = "#f9fafb"; e.target.style.boxShadow = "none"; }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-sm font-medium"
                    style={{ color: "#94a3b8" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full outline-none transition-all mb-5"
                  style={{ padding: "12px 16px", border: "1.5px solid #d1d5db", borderRadius: 12, fontSize: 15, color: "#1a3c34", background: "#f9fafb" }}
                  onFocus={(e) => { e.target.style.borderColor = "#0d9488"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.background = "#f9fafb"; e.target.style.boxShadow = "none"; }}
                  required
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full border-none cursor-pointer font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ padding: 14, background: "#0d9488", color: "#fff", borderRadius: 12, fontSize: 16, boxShadow: "0 4px 14px rgba(13,148,136,0.25)" }}
                >
                  {submitting ? "Resetting..." : "Reset password"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center mx-auto mb-5" style={{ width: 56, height: 56, background: "#dcfce7", borderRadius: 14 }}>
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-[24px] font-extrabold mb-2 text-center" style={{ color: "#1a3c34" }}>Password reset</h1>
              <p className="text-[15px] mb-2 text-center" style={{ color: "#64748b" }}>
                Your password has been changed. Redirecting you to sign in...
              </p>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth" className="text-sm font-semibold hover:underline" style={{ color: "#0d9488" }}>
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
