const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

export async function api(endpoint: string, options: ApiOptions = {}) {
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

  if (!res.ok) {
    const error = new Error(data.message || data.error || 'Something went wrong');
    (error as unknown as Record<string, unknown>).status = res.status;
    throw error;
  }

  return data;
}

// Convenience methods
export const apiGet = (endpoint: string) => api(endpoint);
export const apiPost = (endpoint: string, body: unknown) => api(endpoint, { method: 'POST', body });
export const apiPut = (endpoint: string, body: unknown) => api(endpoint, { method: 'PUT', body });
export const apiDelete = (endpoint: string) => api(endpoint, { method: 'DELETE' });
