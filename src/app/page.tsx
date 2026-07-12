'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/icons/Logo';

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll reveal: fade + rise elements in as they scroll into view.
  // Classes are removed once revealed so the cards' hover transforms keep working.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    const show = (el: Element) => {
      el.classList.add('in');
      window.setTimeout(() => el.classList.remove('reveal', 'in'), 1200);
    };
    if (!('IntersectionObserver' in window)) {
      els.forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            show(en.target);
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      {/* ==================== NAVBAR ==================== */}
      <nav className="sticky top-0 z-50 bg-[#1a3c34] px-5 md:px-[60px]">
        <div className="w-full max-w-[1200px] mx-auto h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="w-9 h-9" />
            <span className="text-white font-bold text-[20px]">
              Memory<span className="text-[#5eead4]">Care</span>
            </span>
          </Link>

          {/* Center Nav (desktop) */}
          <div className="hidden lg:flex items-center gap-1 bg-[rgba(255,255,255,0.07)] rounded-full px-2 py-1.5">
            <Link href="/" className="px-5 py-2 rounded-full bg-[rgba(255,255,255,0.12)] text-white text-[14px] font-medium">
              Home
            </Link>
            <Link href="#features" className="px-5 py-2 rounded-full text-[#94a3b8] text-[14px] font-medium hover:text-white transition">
              Features
            </Link>
            <Link href="/about" className="px-5 py-2 rounded-full text-[#94a3b8] text-[14px] font-medium hover:text-white transition">
              About
            </Link>
            <Link href="/contact" className="px-5 py-2 rounded-full text-[#94a3b8] text-[14px] font-medium hover:text-white transition">
              Contact
            </Link>
          </div>

          {/* Right (desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/auth" className="text-[#94a3b8] hover:text-white text-[14px] font-medium px-5 py-2.5 rounded-lg transition">
              Login
            </Link>
            <Link href="/auth" className="bg-[#0d9488] hover:bg-[#0f766e] text-white text-[14px] font-semibold px-6 py-2.5 rounded-lg transition">
              Sign Up
            </Link>
          </div>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden text-white p-2 -mr-2"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 flex flex-col gap-1 max-w-[1200px] mx-auto">
            <Link href="/" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-lg text-white text-[15px] font-medium bg-[rgba(255,255,255,0.08)]">Home</Link>
            <Link href="#features" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-lg text-[#cbd5e1] text-[15px] font-medium hover:bg-[rgba(255,255,255,0.06)]">Features</Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-lg text-[#cbd5e1] text-[15px] font-medium hover:bg-[rgba(255,255,255,0.06)]">About</Link>
            <Link href="/contact" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-lg text-[#cbd5e1] text-[15px] font-medium hover:bg-[rgba(255,255,255,0.06)]">Contact</Link>
            <div className="flex gap-3 mt-2">
              <Link href="/auth" onClick={() => setMobileOpen(false)} className="flex-1 text-center border border-[rgba(255,255,255,0.2)] text-white text-[14px] font-medium px-4 py-2.5 rounded-lg">Login</Link>
              <Link href="/auth" onClick={() => setMobileOpen(false)} className="flex-1 text-center bg-[#0d9488] text-white text-[14px] font-semibold px-4 py-2.5 rounded-lg">Sign Up</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden min-h-[560px] lg:min-h-[calc(100vh-72px)] flex items-center">
        {/* Full-bleed background photo with a slow zoom (Ken Burns) */}
        <img
          src="/images/hero2.jfif"
          alt="An elderly couple sharing memories together in a garden"
          className="absolute inset-0 w-full h-full object-cover object-[72%_22%] hero-ken"
        />
        {/* Readability scrim — darker on the left, behind the text, fading to reveal the photo on the right */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(100deg,rgba(13,27,23,0.9)_0%,rgba(15,43,37,0.62)_28%,rgba(26,60,52,0.18)_52%,rgba(26,60,52,0)_72%)]" />

        {/* Content — text left, over the photo */}
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 md:px-[60px]">
          <div className="max-w-[600px] animate-fade-in-up">
            <h1 className="text-[34px] sm:text-[44px] md:text-[52px] font-bold leading-[1.12] text-white mb-6 [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]">
              Every Memory Matters.<br />
              <span className="text-[#5eead4]">We Help You Keep Them.</span>
            </h1>

            <p className="text-[17px] leading-[1.7] text-[#e2e8f0] mb-10 max-w-[520px] [text-shadow:0_1px_16px_rgba(0,0,0,0.4)]">
              AI-powered memory care for Alzheimer&apos;s &amp; dementia patients. Medication reminders, daily routines, face recognition, and 24/7 emergency support — all in one place.
            </p>

            <div className="flex items-center gap-4">
              <Link href="/auth" className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-semibold px-8 py-3.5 rounded-xl text-[15px] transition">
                Get Started &rarr;
              </Link>
              <button className="border border-[rgba(255,255,255,0.35)] text-white font-semibold px-8 py-3.5 rounded-xl text-[15px] hover:bg-[rgba(255,255,255,0.08)] transition bg-transparent">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section id="features" className="bg-[#f5f6f5] px-6 md:px-[60px] py-16 md:py-[100px]">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="text-center mb-16 reveal">
            <span className="inline-block bg-[#e6f7f5] text-[#0d9488] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">+ Core Features</span>
            <h2 className="text-[28px] md:text-[38px] font-bold text-[#1a3c34] mb-4">Your Care, Your Way. Delivered Every Day.</h2>
            <p className="text-[17px] text-[#64748b] max-w-[600px] mx-auto">Everything patients and caregivers need to manage cognitive care with compassion and intelligence.</p>
          </div>

          {/* 3x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 stagger">
            {/* 1 - Medication Reminders */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-[32px] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group reveal">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.5 1.5H13.5C14.33 1.5 15 2.17 15 3V4.5H9V3C9 2.17 9.67 1.5 10.5 1.5Z" />
                  <rect x="6" y="4.5" width="12" height="18" rx="3" />
                  <line x1="12" y1="10" x2="12" y2="16" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#1a3c34] mb-2">Medication Reminders</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed mb-4">Never miss a dose with smart medication schedules, notifications, and real-time tracking for patients and caregivers.</p>
              <Link href="#" className="text-[#0d9488] text-[14px] font-medium group-hover:underline">Learn more &rarr;</Link>
            </div>

            {/* 2 - Daily Routines */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-[32px] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group reveal">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#1a3c34] mb-2">Daily Routines</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed mb-4">Organize daily activities with structured routines and schedules designed to maintain cognitive health.</p>
              <Link href="#" className="text-[#0d9488] text-[14px] font-medium group-hover:underline">Learn more &rarr;</Link>
            </div>

            {/* 3 - Face Recognition */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-[32px] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group reveal">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#1a3c34] mb-2">Face Recognition</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed mb-4">Identify family members and loved ones with AI-powered facial recognition to help patients remember.</p>
              <Link href="#" className="text-[#0d9488] text-[14px] font-medium group-hover:underline">Learn more &rarr;</Link>
            </div>

            {/* 4 - Activity Tracking */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-[32px] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group reveal">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#1a3c34] mb-2">Activity Tracking</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed mb-4">Monitor daily activities and health metrics in real-time to ensure consistent and quality care.</p>
              <Link href="#" className="text-[#0d9488] text-[14px] font-medium group-hover:underline">Learn more &rarr;</Link>
            </div>

            {/* 5 - AI Chatbot */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-[32px] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group reveal">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  <line x1="9" y1="10" x2="9" y2="10" />
                  <line x1="12" y1="10" x2="12" y2="10" />
                  <line x1="15" y1="10" x2="15" y2="10" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#1a3c34] mb-2">AI Chatbot</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed mb-4">Intelligent conversations and support available 24/7 to assist patients and caregivers at any time.</p>
              <Link href="#" className="text-[#0d9488] text-[14px] font-medium group-hover:underline">Learn more &rarr;</Link>
            </div>

            {/* 6 - Caregiver Dashboard */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-[32px] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group reveal">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#1a3c34] mb-2">Caregiver Dashboard</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed mb-4">A centralized hub for caregivers to monitor patients, manage tasks, and coordinate with families.</p>
              <Link href="#" className="text-[#0d9488] text-[14px] font-medium group-hover:underline">Learn more &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="bg-[#f5f6f5] px-6 md:px-[60px] py-16 md:py-[100px]">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="text-center mb-16 reveal">
            <span className="inline-block bg-[#e6f7f5] text-[#0d9488] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">+ How It Works</span>
            <h2 className="text-[28px] md:text-[38px] font-bold text-[#1a3c34] mb-4">Get Started in 3 Simple Steps</h2>
          </div>

          {/* Steps */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-10 md:gap-0">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center max-w-[300px]">
              <div className="w-[72px] h-[72px] bg-[#1a3c34] rounded-2xl flex items-center justify-center mb-6">
                <span className="text-[#5eead4] text-[24px] font-bold">01</span>
              </div>
              <h3 className="text-[20px] font-bold text-[#1a3c34] mb-2">Create an Account</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed">Sign up with your basic information and get started in under a minute.</p>
            </div>

            {/* Connector */}
            <div className="hidden md:block flex-1 border-t-2 border-dashed border-[#d1d5db] mt-9 mx-4" />

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center max-w-[300px]">
              <div className="w-[72px] h-[72px] bg-[#1a3c34] rounded-2xl flex items-center justify-center mb-6">
                <span className="text-[#5eead4] text-[24px] font-bold">02</span>
              </div>
              <h3 className="text-[20px] font-bold text-[#1a3c34] mb-2">Set Up Your Care Plan</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed">Configure medications, routines, and preferences tailored to the patient&apos;s needs.</p>
            </div>

            {/* Connector */}
            <div className="hidden md:block flex-1 border-t-2 border-dashed border-[#d1d5db] mt-9 mx-4" />

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center max-w-[300px]">
              <div className="w-[72px] h-[72px] bg-[#1a3c34] rounded-2xl flex items-center justify-center mb-6">
                <span className="text-[#5eead4] text-[24px] font-bold">03</span>
              </div>
              <h3 className="text-[20px] font-bold text-[#1a3c34] mb-2">Stay Connected</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed">Monitor care in real-time and stay connected with your loved ones every day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="bg-[linear-gradient(160deg,#1a3c34,#0f2b25)] px-6 md:px-[60px] py-16 md:py-[100px]">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="text-[30px] md:text-[38px] font-bold text-white mb-5">
            Start Caring <span className="text-[#5eead4]">Today</span>
          </h2>
          <p className="text-[17px] text-[#94a3b8] mb-10 leading-relaxed">
            Join hundreds of Pakistani families who trust MemoryCare to support their loved ones with compassion and intelligence.
          </p>
          <Link href="/auth" className="inline-block bg-[#0d9488] hover:bg-[#0f766e] text-white font-semibold px-10 py-4 rounded-xl text-[16px] transition">
            Get Started Free &rarr;
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer id="contact" className="bg-[#0f1f1b] px-6 md:px-[60px] py-14 md:py-[60px]">
        <div className="max-w-[1200px] mx-auto">
          {/* 4-Column Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <Logo className="w-9 h-9" />
                <span className="text-white font-bold text-[18px]">
                  Memory<span className="text-[#5eead4]">Care</span>
                </span>
              </div>
              <p className="text-[#94a3b8] text-[14px] leading-relaxed mb-6">
                AI-powered memory care for Alzheimer&apos;s and dementia patients. Supporting families across Pakistan.
              </p>
              {/* Social Icons */}
              <div className="flex items-center gap-3">
                {/* Facebook */}
                <a href="#" className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#94a3b8] hover:text-[#5eead4] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                {/* LinkedIn */}
                <a href="#" className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#94a3b8] hover:text-[#5eead4] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                {/* Twitter/X */}
                <a href="#" className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#94a3b8] hover:text-[#5eead4] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                {/* Instagram */}
                <a href="#" className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#94a3b8] hover:text-[#5eead4] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold text-[15px] mb-5">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="/" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">Home</Link></li>
                <li><Link href="#features" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">Features</Link></li>
                <li><Link href="/about" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">About Us</Link></li>
                <li><Link href="/contact" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">Contact</Link></li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-white font-semibold text-[15px] mb-5">Features</h4>
              <ul className="space-y-3">
                <li><Link href="/patient/medications" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">Medication Reminders</Link></li>
                <li><Link href="/patient/routines" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">Daily Routines</Link></li>
                <li><Link href="/patient/face-recognition" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">Face Recognition</Link></li>
                <li><Link href="/patient/chatbot" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">AI Chatbot</Link></li>
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h4 className="text-white font-semibold text-[15px] mb-5">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-[#94a3b8] text-[14px]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Islamabad, Pakistan
                </li>
                <li>
                  <a href="tel:+923001234567" className="flex items-center gap-2 text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    +92 300 1234567
                  </a>
                </li>
                <li>
                  <a href="mailto:support@memorycare.pk" className="flex items-center gap-2 text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    support@memorycare.pk
                  </a>
                </li>
                <li>
                  <Link href="#" className="flex items-center gap-2 text-[#5eead4] text-[14px] font-medium hover:underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Get Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center">
            <p className="text-[#64748b] text-[14px]">&copy; 2026 MemoryCare. Made in Pakistan with care.</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-[#64748b] text-[14px] hover:text-[#94a3b8] transition">Privacy Policy</Link>
              <Link href="#" className="text-[#64748b] text-[14px] hover:text-[#94a3b8] transition">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
