'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/icons/Logo';

/**
 * Shared marketing navbar (Home, About, Contact). Retains the existing style —
 * dark bar, pill center nav, Login/Sign Up — adds a mobile hamburger, and
 * highlights the active link based on the current route.
 */
const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#features', label: 'Features' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href.includes('#')) return false; // anchor link, no active page
    if (href === '/') return pathname === '/';
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
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
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`px-5 py-2 rounded-full text-[14px] font-medium transition ${
                isActive(l.href)
                  ? 'bg-[rgba(255,255,255,0.12)] text-white'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
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
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`px-4 py-3 rounded-lg text-[15px] font-medium ${
                isActive(l.href)
                  ? 'text-white bg-[rgba(255,255,255,0.08)]'
                  : 'text-[#cbd5e1] hover:bg-[rgba(255,255,255,0.06)]'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-3 mt-2">
            <Link href="/auth" onClick={() => setMobileOpen(false)} className="flex-1 text-center border border-[rgba(255,255,255,0.2)] text-white text-[14px] font-medium px-4 py-2.5 rounded-lg">Login</Link>
            <Link href="/auth" onClick={() => setMobileOpen(false)} className="flex-1 text-center bg-[#0d9488] text-white text-[14px] font-semibold px-4 py-2.5 rounded-lg">Sign Up</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
