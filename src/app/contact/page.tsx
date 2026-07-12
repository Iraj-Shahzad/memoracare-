'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/icons/Logo';
import Footer from '@/components/shared/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to backend API in Phase 3
    setSubmitted(true);
  };

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
            <Link href="/about" className="px-5 py-2 rounded-full text-[#94a3b8] text-[14px] font-medium hover:text-white transition">
              About
            </Link>
            <Link href="/contact" className="px-5 py-2 rounded-full bg-[rgba(255,255,255,0.12)] text-white text-[14px] font-medium">
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
          <span className="inline-block bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[#5eead4] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-5">Get In Touch</span>
          <h1 className="text-[42px] font-bold text-white mb-4">We&apos;d Love to Hear From You</h1>
          <p className="text-[17px] text-[#94a3b8] leading-relaxed">Have questions about MemoryCare? Need help getting started? Our team is here to support you every step of the way.</p>
        </div>
      </section>

      {/* ==================== CONTACT CONTENT ==================== */}
      <section className="bg-[#f5f6f5] px-[60px] py-[80px]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 gap-16">
          {/* Left: Contact Info */}
          <div>
            <h2 className="text-[28px] font-bold text-[#1a3c34] mb-3">Contact Information</h2>
            <p className="text-[15px] text-[#64748b] leading-relaxed mb-10">Reach out to us through any of these channels. We typically respond within 24 hours.</p>

            <div className="space-y-6">
              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="w-[48px] h-[48px] rounded-xl bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1a3c34] mb-1">Our Office</h3>
                  <p className="text-[14px] text-[#64748b] leading-relaxed">Islamabad, Pakistan</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="w-[48px] h-[48px] rounded-xl bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1a3c34] mb-1">Phone</h3>
                  <a href="tel:+923001234567" className="text-[14px] text-[#0d9488] hover:underline">+92 300 1234567</a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-[48px] h-[48px] rounded-xl bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1a3c34] mb-1">Email</h3>
                  <a href="mailto:support@memorycare.pk" className="text-[14px] text-[#0d9488] hover:underline">support@memorycare.pk</a>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-4">
                <div className="w-[48px] h-[48px] rounded-xl bg-[linear-gradient(135deg,#0d9488,#14b8a6)] flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1a3c34] mb-1">Working Hours</h3>
                  <p className="text-[14px] text-[#64748b]">Monday to Friday, 9:00 AM to 6:00 PM (PKT)</p>
                  <p className="text-[14px] text-[#64748b]">Emergency support available 24/7</p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-10">
              <h3 className="text-[15px] font-semibold text-[#1a3c34] mb-4">Follow Us</h3>
              <div className="flex items-center gap-3">
                <a href="#" className="w-10 h-10 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:text-[#0d9488] hover:border-[#0d9488] transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:text-[#0d9488] hover:border-[#0d9488] transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:text-[#0d9488] hover:border-[#0d9488] transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:text-[#0d9488] hover:border-[#0d9488] transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-[72px] h-[72px] bg-[#e6f7f5] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-[24px] font-bold text-[#1a3c34] mb-3">Message Sent!</h3>
                <p className="text-[15px] text-[#64748b] mb-8">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                <button
                  onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', phone: '', subject: '', message: '' }); }}
                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-semibold px-8 py-3 rounded-xl text-[15px] transition"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-[24px] font-bold text-[#1a3c34] mb-2">Send Us a Message</h2>
                <p className="text-[14px] text-[#64748b] mb-8">Fill out the form below and we will get back to you as soon as possible.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Ahmed Khan"
                        className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[14px] text-[#1a3c34] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="e.g. ahmed@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[14px] text-[#1a3c34] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="e.g. +92 300 1234567"
                        className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[14px] text-[#1a3c34] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Subject</label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[14px] text-[#1a3c34] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition"
                      >
                        <option value="">Select a subject</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="account">Account Help</option>
                        <option value="feedback">Feedback</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Tell us how we can help you..."
                      className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[14px] text-[#1a3c34] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white font-semibold py-3.5 rounded-xl text-[15px] transition"
                  >
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
