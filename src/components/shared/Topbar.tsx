"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";

interface TopbarProps {
  title: string;
  subtitle?: string;
  greeting?: string;
  avatar?: string;
  showSOS?: boolean;
  showAddButton?: { label: string; onClick?: () => void };
  children?: React.ReactNode;
}

export default function Topbar({
  title,
  subtitle,
  greeting,
  avatar,
  showSOS = true,
  showAddButton,
  children,
}: TopbarProps) {
  const { user } = useAuth();
  const [sosSending, setSosSending] = useState(false);
  const initials = avatar || (user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U');

  const handleSOS = async () => {
    const patientId = (user?.profile as Record<string, unknown> | undefined)?._id as string | undefined;
    if (user?.role !== 'patient' || !patientId) {
      window.alert('SOS is available for patient accounts.');
      return;
    }
    if (!window.confirm('Send an emergency SOS alert to your caregiver?')) return;
    try {
      setSosSending(true);
      await apiPost('/alerts', {
        patient: patientId,
        type: 'sos',
        severity: 'critical',
        message: `SOS: ${user.name || 'Patient'} needs immediate help.`,
      });
      window.alert('SOS sent — your caregiver has been alerted.');
    } catch {
      window.alert('Could not send SOS. Please contact your caregiver directly.');
    } finally {
      setSosSending(false);
    }
  };
  return (
    <div className="bg-white px-8 py-4 flex items-center justify-between border-b border-slate-200 sticky top-0 z-40">
      <div>
        {greeting ? (
          <h1 className="text-2xl font-bold text-[#1a3c34]">{greeting}</h1>
        ) : (
          <h1 className="text-2xl font-bold text-[#1a3c34]">{title}</h1>
        )}
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {showAddButton && (
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0d9488] text-white rounded-[10px] text-sm font-semibold hover:bg-[#0f766e] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[18px] h-[18px]">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {showAddButton.label}
          </button>
        )}
        {showSOS && (
          <button
            onClick={handleSOS}
            disabled={sosSending}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-[10px] text-[13px] font-bold hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {sosSending ? 'Sending…' : 'SOS'}
          </button>
        )}
        {/* Notification Bell */}
        <button className="w-[42px] h-[42px] rounded-[10px] border border-slate-200 bg-white flex items-center justify-center relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2 border-2 border-white" />
        </button>
        {/* Avatar */}
        <div className="w-[42px] h-[42px] bg-[#0d9488] rounded-[10px] flex items-center justify-center text-white font-bold text-sm">
          {initials}
        </div>
      </div>
    </div>
  );
}
