"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/icons/Logo";
import { useAuth } from "@/context/AuthContext";

type AuthTab = "login" | "register";
type UserRole = "patient" | "caregiver";

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole>("patient");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register form state
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerDob, setRegisterDob] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const dashboardMap: Record<string, string> = {
        patient: '/patient/dashboard',
        caregiver: '/caregiver/dashboard',
        admin: '/admin/dashboard',
      };
      router.push(dashboardMap[user.role] || '/patient/dashboard');
    }
  }, [user, router]);

  const redirectByRole = (role: string) => {
    const dashboardMap: Record<string, string> = {
      patient: '/patient/dashboard',
      caregiver: '/caregiver/dashboard',
      admin: '/admin/dashboard',
    };
    router.push(dashboardMap[role] || '/patient/dashboard');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(loginEmail, loginPassword);
      redirectByRole(loggedInUser.role);
    } catch (err: unknown) {
      const error = err as Error;
      setLoginError(error.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    setRegisterSuccess("");

    // Validation
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }
    if (registerPassword.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      return;
    }
    if (!agreeTerms) {
      setRegisterError("Please agree to the Terms & Privacy Policy.");
      return;
    }

    setIsSubmitting(true);

    try {
      const registeredUser = await register({
        name: registerFullName,
        email: registerEmail,
        password: registerPassword,
        role: selectedRole,
        phone: registerPhone ? `+92${registerPhone}` : undefined,
      });
      setRegisterSuccess("Account created successfully! Redirecting...");
      setTimeout(() => redirectByRole(registeredUser.role), 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setRegisterError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Dark Green Gradient */}
      <div
        className="hidden lg:flex lg:flex-1 flex-col justify-center relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1a3c34 0%, #0f2b25 60%, #0d3d35 100%)",
          padding: "60px",
        }}
      >
        {/* Decorative radial gradients */}
        <div
          className="absolute rounded-full"
          style={{
            top: "-100px",
            right: "-80px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-80px",
            left: "-50px",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(94,234,212,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-12 relative z-10">
          <Logo className="w-[42px] h-[42px]" />
          <span className="text-white text-[22px] font-bold">
            Memory<span className="text-[#5eead4]">Care</span>
          </span>
        </Link>

        {/* Heading */}
        <h2 className="text-4xl font-extrabold text-white leading-tight mb-4 relative z-10">
          {activeTab === "login" ? (
            <>
              Welcome Back<br />
              to <span className="text-[#5eead4]">MemoryCare</span>
            </>
          ) : (
            <>
              Join <span className="text-[#5eead4]">MemoryCare</span><br />
              Today
            </>
          )}
        </h2>

        {/* Description */}
        <p className="text-[#94a3b8] text-base leading-relaxed max-w-[400px] mb-10 relative z-10">
          {activeTab === "login"
            ? "Your AI-powered companion for cognitive care. Monitor medications, manage routines, and stay connected with your loved ones."
            : "Create your account and start providing better cognitive care for your loved ones. It takes less than 2 minutes."}
        </p>

        {/* Trust Badges */}
        <div className="flex gap-4 flex-wrap relative z-10">
          {activeTab === "login" ? (
            <>
              <div
                className="flex items-center gap-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "10px 16px",
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[#94a3b8] text-[13px] font-medium">Secure &amp; Private</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "10px 16px",
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="text-[#94a3b8] text-[13px] font-medium">Family Connected</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "10px 16px",
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-[#94a3b8] text-[13px] font-medium">24/7 Support</span>
              </div>
            </>
          ) : (
            <>
              <div
                className="flex items-center gap-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "10px 16px",
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[#94a3b8] text-[13px] font-medium">Secure &amp; Private</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "10px 16px",
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-[#94a3b8] text-[13px] font-medium">Made in Pakistan</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "10px 16px",
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-[#94a3b8] text-[13px] font-medium">Free to Start</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div
        className="flex-1 flex flex-col justify-center items-center"
        style={{ background: "#fff", padding: "60px" }}
      >
        <div className="w-full" style={{ maxWidth: "440px" }}>
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold mb-2" style={{ color: "#1a3c34" }}>
              {activeTab === "login" ? "Sign In" : "Create Account"}
            </h2>
            <p className="text-[15px]" style={{ color: "#64748b" }}>
              {activeTab === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => { setActiveTab("register"); setLoginError(""); }}
                    className="font-semibold hover:underline"
                    style={{ color: "#0d9488" }}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => { setActiveTab("login"); setRegisterError(""); }}
                    className="font-semibold hover:underline"
                    style={{ color: "#0d9488" }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Login Form */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit}>
              {/* Error Message */}
              {loginError && (
                <div
                  className="flex items-center gap-2 mb-5 text-[13px] font-medium"
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 16px",
                    borderRadius: "10px",
                  }}
                >
                  <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {loginError}
                </div>
              )}

              {/* Email */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full outline-none transition-all"
                  style={{
                    padding: "12px 16px",
                    border: "1.5px solid #d1d5db",
                    borderRadius: "12px",
                    fontSize: "15px",
                    color: "#1a3c34",
                    background: "#f9fafb",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0d9488";
                    e.target.style.background = "#fff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.background = "#f9fafb";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
              </div>

              {/* Password */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full outline-none transition-all"
                    style={{
                      padding: "12px 16px",
                      paddingRight: "48px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "12px",
                      fontSize: "15px",
                      color: "#1a3c34",
                      background: "#f9fafb",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d9488";
                      e.target.style.background = "#fff";
                      e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.background = "#f9fafb";
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-sm font-medium"
                    style={{ color: "#94a3b8" }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#0d9488"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#94a3b8"; }}
                  >
                    {showLoginPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between mb-5">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#475569" }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-[18px] h-[18px] cursor-pointer"
                    style={{ accentColor: "#0d9488" }}
                  />
                  Remember me
                </label>
                <Link
                  href="#"
                  className="text-sm font-semibold hover:underline"
                  style={{ color: "#0d9488" }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full border-none cursor-pointer font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  padding: "14px",
                  background: "#0d9488",
                  color: "#fff",
                  borderRadius: "12px",
                  fontSize: "16px",
                  marginTop: "4px",
                  boxShadow: "0 4px 14px rgba(13,148,136,0.25)",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    (e.target as HTMLElement).style.background = "#0f766e";
                    (e.target as HTMLElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = "#0d9488";
                  (e.target as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {isSubmitting ? "Signing In..." : "Sign In →"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3.5 my-6">
                <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
                <span className="text-[13px]" style={{ color: "#94a3b8" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
              </div>

              {/* Google Button */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2.5 cursor-pointer font-semibold text-sm transition-all"
                style={{
                  padding: "12px",
                  background: "#fff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  color: "#374151",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#0d9488";
                  (e.currentTarget as HTMLElement).style.background = "#f0fdfa";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                  (e.currentTarget as HTMLElement).style.background = "#fff";
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit}>
              {/* Error Message */}
              {registerError && (
                <div
                  className="flex items-center gap-2 mb-5 text-[13px] font-medium"
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 16px",
                    borderRadius: "10px",
                  }}
                >
                  <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {registerError}
                </div>
              )}

              {/* Success Message */}
              {registerSuccess && (
                <div
                  className="flex items-center gap-2 mb-5 text-[13px] font-medium"
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#16a34a",
                    padding: "12px 16px",
                    borderRadius: "10px",
                  }}
                >
                  <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {registerSuccess}
                </div>
              )}

              {/* Role Selector */}
              <div className="flex gap-3 mb-7">
                <button
                  type="button"
                  onClick={() => setSelectedRole("patient")}
                  className="flex-1 cursor-pointer text-center transition-all"
                  style={{
                    padding: "16px",
                    borderRadius: "14px",
                    border: selectedRole === "patient" ? "2px solid #0d9488" : "2px solid #e2e8f0",
                    background: selectedRole === "patient" ? "#f0fdfa" : "#fff",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    className="flex items-center justify-center mx-auto mb-2"
                    style={{
                      width: "36px",
                      height: "36px",
                      background: selectedRole === "patient" ? "#ccfbf1" : "#f0fdfa",
                      borderRadius: "10px",
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="text-sm font-bold" style={{ color: "#1a3c34" }}>Patient</div>
                  <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>I need care support</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("caregiver")}
                  className="flex-1 cursor-pointer text-center transition-all"
                  style={{
                    padding: "16px",
                    borderRadius: "14px",
                    border: selectedRole === "caregiver" ? "2px solid #0d9488" : "2px solid #e2e8f0",
                    background: selectedRole === "caregiver" ? "#f0fdfa" : "#fff",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    className="flex items-center justify-center mx-auto mb-2"
                    style={{
                      width: "36px",
                      height: "36px",
                      background: selectedRole === "caregiver" ? "#ccfbf1" : "#f0fdfa",
                      borderRadius: "10px",
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                      <circle cx="20" cy="10" r="2" />
                    </svg>
                  </div>
                  <div className="text-sm font-bold" style={{ color: "#1a3c34" }}>Caregiver</div>
                  <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>I provide care</div>
                </button>
              </div>

              {/* Full Name + Email Row */}
              <div className="flex gap-3.5 mb-5">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={registerFullName}
                    onChange={(e) => setRegisterFullName(e.target.value)}
                    placeholder="Ahmed Khan"
                    className="w-full outline-none transition-all"
                    style={{
                      padding: "12px 16px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "12px",
                      fontSize: "15px",
                      color: "#1a3c34",
                      background: "#f9fafb",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d9488";
                      e.target.style.background = "#fff";
                      e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.background = "#f9fafb";
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full outline-none transition-all"
                    style={{
                      padding: "12px 16px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "12px",
                      fontSize: "15px",
                      color: "#1a3c34",
                      background: "#f9fafb",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d9488";
                      e.target.style.background = "#fff";
                      e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.background = "#f9fafb";
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                  Phone Number
                </label>
                <div
                  className="flex overflow-hidden transition-all"
                  style={{
                    border: "1.5px solid #d1d5db",
                    borderRadius: "12px",
                    background: "#f9fafb",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold"
                    style={{
                      padding: "12px 14px",
                      background: "#f1f5f2",
                      borderRight: "1.5px solid #d1d5db",
                      color: "#374151",
                    }}
                  >
                    <span
                      className="flex items-center justify-center text-white text-[8px] font-bold"
                      style={{
                        width: "20px",
                        height: "14px",
                        background: "#0d9488",
                        borderRadius: "2px",
                      }}
                    >
                      PK
                    </span>
                    +92
                  </div>
                  <input
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="300 1234567"
                    className="flex-1 outline-none"
                    style={{
                      padding: "12px 14px",
                      border: "none",
                      fontSize: "15px",
                      color: "#1a3c34",
                      background: "transparent",
                    }}
                    required
                  />
                </div>
              </div>

              {/* Password + Confirm Password Row */}
              <div className="flex gap-3.5 mb-5">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full outline-none transition-all"
                      style={{
                        padding: "12px 16px",
                        paddingRight: "48px",
                        border: "1.5px solid #d1d5db",
                        borderRadius: "12px",
                        fontSize: "15px",
                        color: "#1a3c34",
                        background: "#f9fafb",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#0d9488";
                        e.target.style.background = "#fff";
                        e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#d1d5db";
                        e.target.style.background = "#f9fafb";
                        e.target.style.boxShadow = "none";
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-sm font-medium"
                      style={{ color: "#94a3b8" }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#0d9488"; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#94a3b8"; }}
                    >
                      {showRegisterPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full outline-none transition-all"
                    style={{
                      padding: "12px 16px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "12px",
                      fontSize: "15px",
                      color: "#1a3c34",
                      background: "#f9fafb",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d9488";
                      e.target.style.background = "#fff";
                      e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.background = "#f9fafb";
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={registerDob}
                  onChange={(e) => setRegisterDob(e.target.value)}
                  className="w-full outline-none transition-all"
                  style={{
                    padding: "12px 16px",
                    border: "1.5px solid #d1d5db",
                    borderRadius: "12px",
                    fontSize: "15px",
                    color: "#1a3c34",
                    background: "#f9fafb",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0d9488";
                    e.target.style.background = "#fff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.background = "#f9fafb";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Emergency Contact Section Divider */}
              <div className="flex items-center gap-2.5 mt-1 mb-[18px]">
                <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>
                  Emergency Contact
                </span>
                <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
              </div>

              {/* Emergency Contact Name + Phone Row */}
              <div className="flex gap-3.5 mb-5">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Family member name"
                    className="w-full outline-none transition-all"
                    style={{
                      padding: "12px 16px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "12px",
                      fontSize: "15px",
                      color: "#1a3c34",
                      background: "#f9fafb",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d9488";
                      e.target.style.background = "#fff";
                      e.target.style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.background = "#f9fafb";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#374151" }}>
                    Contact Phone
                  </label>
                  <div
                    className="flex overflow-hidden transition-all"
                    style={{
                      border: "1.5px solid #d1d5db",
                      borderRadius: "12px",
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold"
                      style={{
                        padding: "12px 14px",
                        background: "#f1f5f2",
                        borderRight: "1.5px solid #d1d5db",
                        color: "#374151",
                      }}
                    >
                      <span
                        className="flex items-center justify-center text-white text-[8px] font-bold"
                        style={{
                          width: "20px",
                          height: "14px",
                          background: "#0d9488",
                          borderRadius: "2px",
                        }}
                      >
                        PK
                      </span>
                      +92
                    </div>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="312 9876543"
                      className="flex-1 outline-none"
                      style={{
                        padding: "12px 14px",
                        border: "none",
                        fontSize: "15px",
                        color: "#1a3c34",
                        background: "transparent",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-center gap-2 text-sm cursor-pointer mb-5" style={{ color: "#475569" }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-[18px] h-[18px] cursor-pointer"
                  style={{ accentColor: "#0d9488" }}
                />
                I agree to the{" "}
                <Link href="#" className="font-semibold no-underline" style={{ color: "#0d9488" }}>
                  Terms &amp; Privacy Policy
                </Link>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full border-none cursor-pointer font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  padding: "14px",
                  background: "#0d9488",
                  color: "#fff",
                  borderRadius: "12px",
                  fontSize: "16px",
                  marginTop: "4px",
                  boxShadow: "0 4px 14px rgba(13,148,136,0.25)",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    (e.target as HTMLElement).style.background = "#0f766e";
                    (e.target as HTMLElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = "#0d9488";
                  (e.target as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {isSubmitting ? "Creating Account..." : "Create Account →"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3.5 my-6">
                <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
                <span className="text-[13px]" style={{ color: "#94a3b8" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
              </div>

              {/* Google Button */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2.5 cursor-pointer font-semibold text-sm transition-all"
                style={{
                  padding: "12px",
                  background: "#fff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  color: "#374151",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#0d9488";
                  (e.currentTarget as HTMLElement).style.background = "#f0fdfa";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                  (e.currentTarget as HTMLElement).style.background = "#fff";
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
