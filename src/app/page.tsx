'use client';

import Link from 'next/link';
import SiteNav from '@/components/shared/SiteNav';
import Footer from '@/components/shared/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteNav />

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden min-h-[560px] lg:min-h-[calc(100vh-72px)] flex items-center">
        {/* Full-bleed background photo with a slow zoom (Ken Burns) */}
        <img
          src="/images/hero2.jfif"
          alt="An elderly couple sharing memories together in a garden"
          className="absolute inset-0 w-full h-full object-cover object-[50%_50%] hero-ken"
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

      <Footer />
    </div>
  );
}
