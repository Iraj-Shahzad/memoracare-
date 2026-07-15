"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import { getSocket, joinPatientRoom, leavePatientRoom } from "@/lib/socket";
import { speak, getLang, voiceRemindersOn, setVoiceReminders, primeVoices } from "@/lib/speech";

interface ReminderToast {
  id: number;
  kind: "medication" | "routine" | "alert";
  message: string;
}

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
  const [toasts, setToasts] = useState<ReminderToast[]>([]);
  const [voiceRem, setVoiceRem] = useState(false);
  const initials = avatar || (user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U');

  const patientId = (user?.profile as Record<string, unknown> | undefined)?._id as string | undefined;

  useEffect(() => {
    setVoiceRem(voiceRemindersOn());
    primeVoices();
  }, []);

  const toggleVoiceReminders = () => {
    const next = !voiceRem;
    setVoiceRem(next);
    setVoiceReminders(next);
    if (next) speak(getLang() === 'ur' ? 'صوتی یاد دہانیاں آن ہیں' : 'Voice reminders are on', getLang());
  };

  // Real-time reminders / missed-dose alerts pushed by the backend scheduler.
  useEffect(() => {
    if (user?.role !== 'patient' || !patientId) return;

    const socket = getSocket();
    const join = () => joinPatientRoom(patientId);
    join();
    socket.on('connect', join);

    let counter = 0;
    const pushToast = (kind: ReminderToast["kind"], message: string) => {
      const id = ++counter + Date.now();
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 8000);
      // Best-effort desktop notification (only if the user already granted it).
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification('MemoryCare', { body: message }); } catch { /* ignore */ }
      }
    };

    const onReminder = (data: { kind?: string; name?: string; message?: string }) => {
      pushToast(data.kind === 'routine' ? 'routine' : 'medication', data.message || 'You have a reminder.');
      // Speak the reminder aloud in the chosen language (if enabled).
      if (voiceRemindersOn()) {
        const lang = getLang();
        const name = data.name || '';
        let text = data.message || '';
        if (lang === 'ur') {
          text = data.kind === 'routine'
            ? `${name} کا وقت ہو گیا ہے۔`
            : `${name ? name + ' ' : ''}دوا لینے کا وقت ہو گیا ہے۔`;
        }
        speak(text, lang);
      }
    };
    const onAlert = (data: { message?: string }) => {
      pushToast('alert', data.message || 'New alert.');
    };

    socket.on('reminder', onReminder);
    socket.on('alert', onAlert);

    // Ask once for desktop-notification permission.
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      socket.off('connect', join);
      socket.off('reminder', onReminder);
      socket.off('alert', onAlert);
      leavePatientRoom(patientId);
    };
  }, [user?.role, patientId]);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleSOS = async () => {
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
    <div className="bg-white pl-16 pr-4 md:px-8 py-4 flex items-center justify-between border-b border-slate-200 sticky top-0 z-40">
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
          <button
            onClick={showAddButton.onClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0d9488] text-white rounded-[10px] text-sm font-semibold hover:bg-[#0f766e] transition-colors"
          >
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
        {/* Voice reminders toggle (patient only) */}
        {user?.role === 'patient' && (
          <button
            onClick={toggleVoiceReminders}
            title={voiceRem ? 'Voice reminders on' : 'Voice reminders off'}
            aria-label="Toggle voice reminders"
            className={`w-[42px] h-[42px] rounded-[10px] border flex items-center justify-center transition-colors ${
              voiceRem ? 'bg-[#0d9488] border-[#0d9488]' : 'bg-white border-slate-200'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={voiceRem ? '#ffffff' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {voiceRem ? (
                <>
                  <path d="M15.54 8.46a5 5 0 010 7.07" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" />
                </>
              ) : (
                <>
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              )}
            </svg>
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

      {/* Real-time reminder / alert toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 w-[320px]">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-[12px] shadow-lg border bg-white animate-[fadeIn_0.2s_ease-out] ${
                t.kind === 'alert' ? 'border-red-200' : 'border-teal-200'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                  t.kind === 'alert' ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-600'
                }`}
              >
                {t.kind === 'medication' ? '💊' : t.kind === 'routine' ? '🗓️' : '⚠️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#1a3c34]">
                  {t.kind === 'alert' ? 'Alert' : 'Reminder'}
                </p>
                <p className="text-[13px] text-slate-600 mt-0.5 break-words">{t.message}</p>
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
