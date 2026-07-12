"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/icons/Logo";
import { useAuth } from "@/context/AuthContext";

interface AdminNavItem {
  label: string;
  href: string;
  badge?: string;
  icon: React.ReactNode;
}

export default function AdminSidebar() {
  const pathname = usePathname();

  const adminNavItems: AdminNavItem[] = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: "User Management",
      href: "/admin/users",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: "Reports",
      href: "/admin/reports",
      badge: "5",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: "System Monitoring",
      href: "/admin/monitoring",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      ),
    },
    {
      label: "Alerts",
      href: "/admin/alerts",
      badge: "3",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  const systemItems = [
    {
      label: "Settings",
      href: "/admin/settings",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      ),
    },
    {
      label: "Security",
      href: "/admin/security",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M18 3C18 3 8 8 8 18c0 7.18 4.48 11.64 8.5 13.5.65.3 1.35.5 1.5.5s.85-.2 1.5-.5C23.52 29.64 28 25.18 28 18c0-10-10-15-10-15z" />
          <polyline points="14 18 17 21 22 15" />
        </svg>
      ),
    },
  ];

  const { logout } = useAuth();

  return (
    <aside className="w-[260px] bg-[#1a3c34] fixed top-0 left-0 bottom-0 overflow-y-auto z-50 flex flex-col">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-6 pt-6 pb-8">
        <Logo />
        <span className="text-white text-xl font-bold">MemoraCare</span>
      </Link>

      {/* Admin Badge */}
      <div className="px-6 pb-4">
        <div className="inline-flex items-center gap-2 bg-purple-600 px-3 py-1.5 rounded-full text-white text-xs font-bold">
          <div className="w-2 h-2 bg-white rounded-full" />
          Admin
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {/* Admin Section */}
        <div>
          <p className="px-6 py-2 text-xs uppercase tracking-wider text-white/50 font-bold">Admin</p>
          <ul className="space-y-0.5">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative ${
                      isActive
                        ? "text-white bg-[rgba(13,148,136,0.2)] border-r-[3px] border-[#0d9488]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 mx-6 my-4" />

        {/* System Section */}
        <div>
          <p className="px-6 py-2 text-xs uppercase tracking-wider text-white/50 font-bold">System</p>
          <ul className="space-y-0.5">
            {systemItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "text-white bg-[rgba(13,148,136,0.2)] border-r-[3px] border-[#0d9488]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all text-white/60 hover:text-white hover:bg-white/5 w-full text-left"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}
