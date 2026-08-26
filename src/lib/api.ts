/**
 * API CLIENT — typed fetch wrapper for every call to the MemoryCare backend.
 *
 * Key concepts: single `api()` fetch wrapper over a configurable API_BASE; bearer
 * token pulled from localStorage and attached as `Authorization: Bearer <token>`;
 * JSON bodies are stringified with Content-Type application/json, while FormData
 * skips Content-Type so the browser can set the multipart boundary itself; non-2xx
 * responses throw an Error carrying the server message and HTTP status; apiDownload
 * fetches an authenticated blob and triggers a browser download via a temporary <a>.
 * Viva line: "One place owns auth headers and error handling, so every request stays consistent and secure."
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

export async function api(endpoint: string, options: ApiOptions = {}) {
  // SSR guard: localStorage only exists in the browser, so token is null on the server.
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!options.isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    ...(options.body
      ? { body: options.isFormData ? (options.body as BodyInit) : JSON.stringify(options.body) }
      : {}),
  });

  const data = await res.json();

  // Reject on any non-2xx: surface the backend's own message and attach the status code.
  if (!res.ok) {
    const error = new Error(data.message || data.error || 'Something went wrong');
    (error as unknown as Record<string, unknown>).status = res.status;
    throw error;
  }

  return data;
}

// Download a file from an authenticated endpoint (e.g. PDF/Excel reports).
// Uses the same bearer token, then triggers a browser download of the blob.
export async function apiDownload(endpoint: string, filename: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    let msg = 'Download failed';
    try { const j = await res.json(); msg = j.message || msg; } catch { /* non-JSON error */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Convenience methods
export const apiGet = (endpoint: string) => api(endpoint);
export const apiPost = (endpoint: string, body: unknown) => api(endpoint, { method: 'POST', body });
export const apiPut = (endpoint: string, body: unknown) => api(endpoint, { method: 'PUT', body });
export const apiDelete = (endpoint: string) => api(endpoint, { method: 'DELETE' });
