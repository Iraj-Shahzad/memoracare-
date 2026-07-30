"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface UIContextValue {
  /** Show a small in-site toast (replaces window.alert). */
  toast: (message: string, type?: ToastType) => void;
  /** Show an in-site confirmation modal (replaces window.confirm). Resolves true/false. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ ...options, resolve });
      }),
    []
  );

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const toastStyle = (type: ToastType): React.CSSProperties => ({
    background: "#fff",
    borderLeft: `4px solid ${type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#0d9488"}`,
    color: "#1a3c34",
    padding: "12px 16px",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    fontSize: 14,
    maxWidth: 360,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  });

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toasts */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ ...toastStyle(t.type), pointerEvents: "auto", animation: "uiToastIn .2s ease" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0, marginTop: 1 }} fill="none"
              stroke={t.type === "success" ? "#16a34a" : t.type === "error" ? "#dc2626" : "#0d9488"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {t.type === "success" ? <polyline points="20 6 9 17 4 12" /> : t.type === "error" ? (<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>) : (<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>)}
            </svg>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.5)", padding: 16 }} onClick={() => closeConfirm(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            {confirmState.title && <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a3c34", marginBottom: 8 }}>{confirmState.title}</h3>}
            <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.6 }}>{confirmState.message}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => closeConfirm(false)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" }}>
                {confirmState.cancelText || "Cancel"}
              </button>
              <button onClick={() => closeConfirm(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: confirmState.danger ? "#dc2626" : "#0d9488", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                {confirmState.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes uiToastIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }`}</style>
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
