"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/icons/Logo";
import { apiPost } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic client-side validation before hitting the server.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/auth/forgot-password", { email: email.trim() });
      // The server returns a generic message either way; we always show the
      // same confirmation so we don't reveal whether the email is registered.
      setSent(true);
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(160deg,#1a3c34 0%,#0f2b25 100%)", padding: 24 }}>
      <div className="w-full" style={{ maxWidth: 440 }}>
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <Logo className="w-[42px] h-[42px]" />
          <span className="text-white text-[22px] font-bold">
            Memory<span className="text-[#5eead4]">Care</span>
          </span>
        </Link>

        <div className="bg-white" style={{ borderRadius: 18, padding: 36, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
          {!sent ? (
            <>
              <h1 className="text-[26px] font-extrabold mb-2" style={{ color: "#1a3c34" }}>Forgot password?</h1>
              <p className="text-[15px] mb-7" style={{ color: "#64748b" }}>
                Enter the email linked to your account and we&apos;ll send you a link to reset your password.
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

                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                  {submitting ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center mx-auto mb-5" style={{ width: 56, height: 56, background: "#dcfce7", borderRadius: 14 }}>
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h1 className="text-[24px] font-extrabold mb-2 text-center" style={{ color: "#1a3c34" }}>Check your email</h1>
              <p className="text-[15px] mb-6 text-center" style={{ color: "#64748b" }}>
                If an account exists for <b>{email}</b>, we&apos;ve sent a link to reset your password. The link expires in 30 minutes.
              </p>
              <p className="text-[13px] mb-6 text-center" style={{ color: "#94a3b8" }}>
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button onClick={() => { setSent(false); }} className="font-semibold hover:underline" style={{ color: "#0d9488" }}>try again</button>.
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
