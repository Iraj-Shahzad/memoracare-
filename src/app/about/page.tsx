'use client';

import Link from 'next/link';
import Logo from '@/components/icons/Logo';
import Footer from '@/components/shared/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* ==================== NAVBAR ==================== */}
      <nav className="sticky top-0 z-50 bg-[#1a3c34] h-[72px] px-[60px] flex items-center">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="w-9 h-9" />
            <span className="text-white font-bold text-[20px]">
              Memory<span className="text-[#5eead4]">Care</span>
            </span>
          </Link>

          <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.07)] rounded-full px-2 py-1.5">
            <Link href="/" className="px-5 py-2 rounded-full text-[#94a3b8] text-[14px] font-medium hover:text-white transition">
              Home
            </Link>
            <Link href="/#features" className="px-5 py-2 rounded-full text-[#94a3b8] text-[14px] font-medium hover:text-white transition" scroll={false}>
              Features
            </Link>
            <Link href="/about" className="px-5 py-2 rounded-full bg-[rgba(255,255,255,0.12)] text-white text-[14px] font-medium">
              About
            </Link>
            <Link href="/contact" className="px-5 py-2 rounded-full text-[#94a3b8] text-[14px] font-medium hover:text-white transition">
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-[#94a3b8] hover:text-white text-[14px] font-medium px-5 py-2.5 rounded-lg transition">
              Login
            </Link>
            <Link href="/auth" className="bg-[#0d9488] hover:bg-[#0f766e] text-white text-[14px] font-semibold px-6 py-2.5 rounded-lg transition">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ==================== HERO BANNER ==================== */}
      <section className="bg-[linear-gradient(160deg,#1a3c34,#122a24,#0d3d35)] px-[60px] py-[60px] text-center relative overflow-hidden">
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.08),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-150px] right-[-50px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.1),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-[600px] mx-auto">
          <span className="inline-block bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[#5eead4] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-5">About Us</span>
          <h1 className="text-[42px] font-bold text-white mb-4">Our Mission is Memory Care</h1>
          <p className="text-[17px] text-[#94a3b8] leading-relaxed">MemoryCare is built with one purpose: to help families navigate the challenges of cognitive disorders with technology, compassion, and dignity.</p>
        </div>
      </section>

      {/* ==================== STATS STRIP ==================== */}
      <section className="bg-[#122a24] px-[60px] py-6">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-center gap-x-16 gap-y-6">
          {[
            { n: '1.5M+', l: 'affected in Pakistan' },
            { n: '3', l: 'user roles' },
            { n: '6', l: 'core care features' },
            { n: '24/7', l: 'support' },
          ].map((s) => (
            <div key={s.l} className="text-center reveal">
              <div className="text-[#5eead4] text-[26px] font-extrabold">{s.n}</div>
              <div className="text-[#94a3b8] text-[13px]">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== OUR STORY ==================== */}
      <section className="bg-[#f5f6f5] px-[60px] py-[80px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 gap-16 items-center">
          {/* Left: About Image with Effect: Grayscale to Color on hover */}
          <div className="group rounded-2xl overflow-hidden">
            <div className="h-[480px] [@media(hover:hover)]:grayscale transition-[filter] duration-700 ease-out group-hover:grayscale-0 rounded-2xl overflow-hidden">
              <img src="/images/about1.jfif" alt="Caring hands" className="w-full h-full object-cover object-[50%_0%]" />
            </div>
          </div>

          {/* Right: Story */}
          <div>
            <span className="inline-block bg-[#e6f7f5] text-[#0d9488] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">Our Story</span>
            <h2 className="text-[32px] font-bold text-[#1a3c34] mb-5">Why We Built MemoryCare</h2>
            <p className="text-[15px] text-[#64748b] leading-[1.8] mb-4">
              In Pakistan, over 1.5 million people are affected by Alzheimer&apos;s and other cognitive disorders. Families often struggle to manage daily care without proper tools or support systems.
            </p>
            <p className="text-[15px] text-[#64748b] leading-[1.8] mb-4">
              MemoryCare was born as a Final Year Project with the vision of bridging this gap. We combine AI technology with human-centered design to create a platform that genuinely helps patients maintain their daily routines, stay connected with loved ones, and live with dignity.
            </p>
            <p className="text-[15px] text-[#64748b] leading-[1.8]">
              From medication reminders to face recognition, every feature is designed with empathy and built with the latest in machine learning and web technologies.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== WHAT WE OFFER ==================== */}
      <section className="bg-white px-[60px] py-[80px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14 reveal">
            <span className="inline-block bg-[#e6f7f5] text-[#0d9488] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">What We Offer</span>
            <h2 className="text-[32px] font-bold text-[#1a3c34] mb-3">A Complete Care Ecosystem</h2>
            <p className="text-[15px] text-[#64748b] max-w-[550px] mx-auto">MemoryCare serves three key user roles, each with tailored features for their specific needs.</p>
          </div>

          <div className="grid grid-cols-3 gap-8 stagger">
            {/* Patients */}
            <div className="bg-[#f5f6f5] rounded-2xl border border-[#e2e8f0] p-8 text-center reveal">
              <div className="w-[60px] h-[60px] rounded-2xl bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="text-[20px] font-bold text-[#1a3c34] mb-3">For Patients</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed">
                Medication reminders, daily routine schedules, an AI chatbot for guidance, face recognition to identify loved ones, and an SOS emergency button for safety.
              </p>
            </div>

            {/* Caregivers */}
            <div className="bg-[#f5f6f5] rounded-2xl border border-[#e2e8f0] p-8 text-center reveal">
              <div className="w-[60px] h-[60px] rounded-2xl bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3 className="text-[20px] font-bold text-[#1a3c34] mb-3">For Caregivers</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed">
                Monitor assigned patients, manage medications and routines, receive real-time alerts, write care notes, and generate compliance reports.
              </p>
            </div>

            {/* Admin */}
            <div className="bg-[#f5f6f5] rounded-2xl border border-[#e2e8f0] p-8 text-center reveal">
              <div className="w-[60px] h-[60px] rounded-2xl bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </div>
              <h3 className="text-[20px] font-bold text-[#1a3c34] mb-3">For Admins</h3>
              <p className="text-[14px] text-[#64748b] leading-relaxed">
                Full system oversight with user management, system monitoring, security controls, report generation, and alert management across the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TECH STACK ==================== */}
      <section className="bg-[#f5f6f5] px-[60px] py-[80px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14 reveal">
            <span className="inline-block bg-[#e6f7f5] text-[#0d9488] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">Technology</span>
            <h2 className="text-[32px] font-bold text-[#1a3c34] mb-3">Built With Modern Technology</h2>
            <p className="text-[15px] text-[#64748b] max-w-[550px] mx-auto">MemoryCare leverages cutting-edge frameworks and AI models to deliver a reliable, fast, and intelligent platform.</p>
          </div>

          <div className="grid grid-cols-4 gap-6 stagger">
            {[
              { title: 'Next.js', desc: 'React framework for a fast, modern frontend experience' },
              { title: 'Node.js + Express', desc: 'Robust backend API with real-time Socket.io support' },
              { title: 'MongoDB', desc: 'Flexible NoSQL database for patient records and care data' },
              { title: 'TensorFlow / Keras', desc: 'AI models for NLP chatbot and Siamese face recognition' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-[#e2e8f0] p-6 text-center hover:shadow-md transition reveal">
                <div className="w-[48px] h-[48px] rounded-xl bg-[#1a3c34] flex items-center justify-center mx-auto mb-4">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-bold text-[#1a3c34] mb-2">{item.title}</h3>
                <p className="text-[13px] text-[#64748b] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="bg-[linear-gradient(160deg,#1a3c34,#0f2b25)] px-[60px] py-[80px]">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="text-[36px] font-bold text-white mb-4">
            Ready to Get <span className="text-[#5eead4]">Started?</span>
          </h2>
          <p className="text-[17px] text-[#94a3b8] mb-8 leading-relaxed">
            Join MemoryCare today and give your loved ones the care they deserve.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth" className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-semibold px-10 py-4 rounded-xl text-[15px] transition">
              Create Account &rarr;
            </Link>
            <Link href="/contact" className="border border-[rgba(255,255,255,0.2)] text-white font-semibold px-10 py-4 rounded-xl text-[15px] hover:bg-[rgba(255,255,255,0.05)] transition">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
