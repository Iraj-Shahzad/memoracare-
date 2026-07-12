import Link from 'next/link';
import Logo from '@/components/icons/Logo';

/**
 * Shared site footer used across the marketing pages (Home, About, Contact).
 * Edit here once and it updates everywhere.
 */
export default function Footer() {
  return (
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
  );
}
