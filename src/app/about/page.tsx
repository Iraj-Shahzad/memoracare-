'use client';

import Link from 'next/link';
import Logo from '@/components/icons/Logo';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* ==================== NAVBAR ==================== */}
      <nav className="sticky top-0 z-50 bg-[#1a3c34] h-[72px] px-[60px] flex items-center">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="w-9 h-9" />
            <span className="text-white font-bold text-[20px]">
              Memora<span className="text-[#5eead4]">Care</span>
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
          <p className="text-[17px] text-[#94a3b8] leading-relaxed">MemoraCare is built with one purpose: to help families navigate the challenges of cognitive disorders with technology, compassion, and dignity.</p>
        </div>
      </section>

      {/* ==================== OUR STORY ==================== */}
      <section className="bg-[#f5f6f5] px-[60px] py-[80px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 gap-16 items-center">
          {/* Left: About Image with Effect: Grayscale to Color on hover */}
          <div className="group rounded-2xl overflow-hidden">
            <div className="h-[480px] grayscale transition-[filter] duration-700 ease-out group-hover:grayscale-0 rounded-2xl overflow-hidden">
              <img src="/images/about1.jfif" alt="Caring hands" className="w-full h-full object-cover object-[50%_0%]" />
            </div>
          </div>

          {/* Right: Story */}
          <div>
            <span className="inline-block bg-[#e6f7f5] text-[#0d9488] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">Our Story</span>
            <h2 className="text-[32px] font-bold text-[#1a3c34] mb-5">Why We Built MemoraCare</h2>
            <p className="text-[15px] text-[#64748b] leading-[1.8] mb-4">
              In Pakistan, over 1.5 million people are affected by Alzheimer&apos;s and other cognitive disorders. Families often struggle to manage daily care without proper tools or support systems.
            </p>
            <p className="text-[15px] text-[#64748b] leading-[1.8] mb-4">
              MemoraCare was born as a Final Year Project with the vision of bridging this gap. We combine AI technology with human-centered design to create a platform that genuinely helps patients maintain their daily routines, stay connected with loved ones, and live with dignity.
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
          <div className="text-center mb-14">
            <span className="inline-block bg-[#e6f7f5] text-[#0d9488] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">What We Offer</span>
            <h2 className="text-[32px] font-bold text-[#1a3c34] mb-3">A Complete Care Ecosystem</h2>
            <p className="text-[15px] text-[#64748b] max-w-[550px] mx-auto">MemoraCare serves three key user roles, each with tailored features for their specific needs.</p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Patients */}
            <div className="bg-[#f5f6f5] rounded-2xl border border-[#e2e8f0] p-8 text-center">
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
            <div className="bg-[#f5f6f5] rounded-2xl border border-[#e2e8f0] p-8 text-center">
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
            <div className="bg-[#f5f6f5] rounded-2xl border border-[#e2e8f0] p-8 text-center">
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
          <div className="text-center mb-14">
            <span className="inline-block bg-[#e6f7f5] text-[#0d9488] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">Technology</span>
            <h2 className="text-[32px] font-bold text-[#1a3c34] mb-3">Built With Modern Technology</h2>
            <p className="text-[15px] text-[#64748b] max-w-[550px] mx-auto">MemoraCare leverages cutting-edge frameworks and AI models to deliver a reliable, fast, and intelligent platform.</p>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {[
              { title: 'Next.js', desc: 'React framework for a fast, modern frontend experience' },
              { title: 'Node.js + Express', desc: 'Robust backend API with real-time Socket.io support' },
              { title: 'MongoDB', desc: 'Flexible NoSQL database for patient records and care data' },
              { title: 'TensorFlow / Keras', desc: 'AI models for NLP chatbot and Siamese face recognition' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-[#e2e8f0] p-6 text-center hover:shadow-md transition">
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
            Join MemoraCare today and give your loved ones the care they deserve.
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

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-[#0f1f1b] px-[60px] py-[60px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-4 gap-10 mb-14">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <Logo className="w-9 h-9" />
                <span className="text-white font-bold text-[18px]">
                  Memora<span className="text-[#5eead4]">Care</span>
                </span>
              </div>
              <p className="text-[#94a3b8] text-[14px] leading-relaxed mb-6">
                AI-powered memory care for Alzheimer&apos;s and dementia patients. Supporting families across Pakistan.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#94a3b8] hover:text-[#5eead4] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#94a3b8] hover:text-[#5eead4] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#94a3b8] hover:text-[#5eead4] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#94a3b8] hover:text-[#5eead4] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold text-[15px] mb-5">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="/" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">Home</Link></li>
                <li><Link href="/#features" className="text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">Features</Link></li>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  Islamabad, Pakistan
                </li>
                <li>
                  <a href="tel:+923001234567" className="flex items-center gap-2 text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                    +92 300 1234567
                  </a>
                </li>
                <li>
                  <a href="mailto:support@memoracare.pk" className="flex items-center gap-2 text-[#94a3b8] text-[14px] hover:text-[#5eead4] transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                    support@memoracare.pk
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.08)] pt-8 flex items-center justify-between">
            <p className="text-[#64748b] text-[14px]">&copy; 2026 MemoraCare. Made in Pakistan with care.</p>
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
