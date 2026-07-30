"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import { getSocket, joinPatientRoom, leavePatientRoom } from "@/lib/socket";
import { speak, getLang, voiceRemindersOn, setVoiceReminders, primeVoices } from "@/lib/speech";
import { loadSettings } from "@/lib/patientSettings";

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
  const { user, logout } = useAuth();
  const [sosSending, setSosSending] = useState(false);
  const [toasts, setToasts] = useState<ReminderToast[]>([]);
  const [voiceRem, setVoiceRem] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  // Live clock tick so the greeting stays in sync with the viewer's local
  // (device/country) time even if the page is left open across the hour.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // If a page passes a "Good Morning/Afternoon/Evening, Name" greeting, always
  // recompute the time-of-day word from the CURRENT local time so it can never
  // be stale (e.g. a server-rendered value) or wrong for the viewer's timezone.
  const displayGreeting = useMemo(() => {
    if (!greeting) return greeting;
    const m = greeting.match(/^Good (?:Morning|Afternoon|Evening|Night)\s*(?:,\s*(.*))?$/i);
    if (!m) return greeting;
    const h = new Date().getHours();
    const word =
      h < 12 ? "Good Morning"
      : h < 17 ? "Good Afternoon"
      : h < 21 ? "Good Evening"
      : "Good Night";
    return m[1] ? `${word}, ${m[1]}` : word;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, clockTick]);
  const roleBase = user?.role ? `/${user.role}` : "";
  const initials = avatar || (user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U');

  const patientId = ((user?.profile as Record<string, unknown> | undefined)?._id as string | undefined) || user?.id;

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

  // Real-time reminders / alerts pushed by the backend.
  // - Patients join their PATIENT room → receive medication/routine reminders.
  // - Caregivers/admins join their own USER-ID room → receive alerts about their
  //   patients (e.g. an SOS), instead of the SOS popping on the patient's screen.
  useEffect(() => {
    if (!user) return;
    const room = user.role === 'patient' ? patientId : user.id;
    if (!room) return;

    const socket = getSocket();
    const join = () => joinPatientRoom(room);
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
      // Respect the patient's notification preferences.
      const s = loadSettings();
      const kind = data.kind === 'routine' ? 'routine' : 'medication';
      if (kind === 'medication' && !s.medReminders) return;
      if (kind === 'routine' && !s.routineReminders) return;
      pushToast(kind, data.message || 'You have a reminder.');
      // Speak the reminder aloud in the chosen language (if enabled + voice alerts on).
      if (voiceRemindersOn() && s.voiceAlerts) {
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
      // Respect the patient's Emergency Alerts preference.
      if (!loadSettings().emergencyAlerts) return;
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
      leavePatientRoom(room);
    };
  }, [user?.role, user?.id, patientId]);

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
        {displayGreeting ? (
          <h1 className="text-2xl font-bold text-[#1a3c34]">{displayGreeting}</h1>
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
        {showSOS && user?.role === 'patient' && (
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
        <div className="relative">
          <button onClick={() => { setShowNotifs((s) => !s); setShowMenu(false); }} aria-label="Notifications" className="w-[42px] h-[42px] rounded-[10px] border border-slate-200 bg-white flex items-center justify-center relative hover:bg-slate-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {toasts.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2 border-2 border-white" />}
          </button>
          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-[#1a3c34]">Notifications</div>
                {toasts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No new notifications</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {toasts.map((t) => (
                      <div key={t.id} className="px-4 py-3 border-b border-slate-50 text-sm text-slate-700 flex gap-2">
                        <span>{t.kind === 'medication' ? '💊' : t.kind === 'routine' ? '🗓️' : '⚠️'}</span>
                        <span>{t.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(user?.role === 'caregiver' || user?.role === 'admin') && (
                  <Link href={`${roleBase}/alerts`} onClick={() => setShowNotifs(false)} className="block px-4 py-3 text-sm font-semibold text-[#0d9488] hover:bg-slate-50 border-t border-slate-100">View all alerts</Link>
                )}
              </div>
            </>
          )}
        </div>
        {/* Avatar + account menu */}
        <div className="relative">
          <button onClick={() => { setShowMenu((s) => !s); setShowNotifs(false); }} aria-label="Account menu" className="w-[42px] h-[42px] bg-[#0d9488] rounded-[10px] flex items-center justify-center text-white font-bold text-sm hover:bg-[#0f766e]">
            {initials}
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-bold text-[#1a3c34] truncate">{user?.name || 'User'}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.email || ''}</div>
                  <div className="text-[11px] text-slate-400 capitalize mt-0.5">{user?.role}</div>
                </div>
                {user?.role !== 'admin' && (
                  <Link href={`${roleBase}/profile`} onClick={() => setShowMenu(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Profile</Link>
                )}
                <Link href={`${roleBase}/settings`} onClick={() => setShowMenu(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Settings</Link>
                <button onClick={() => { setShowMenu(false); setShowLogoutConfirm(true); }} className="block w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 border-t border-slate-100">Log out</button>
              </div>
            </>
          )}
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

      {/* Log out confirmation (in-site, not a browser popup) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a3c34] mb-1">Log out?</h3>
            <p className="text-sm text-slate-600 mb-5">You&apos;ll need to sign in again to use MemoraCare.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { setShowLogoutConfirm(false); logout(); }} className="px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700">Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
