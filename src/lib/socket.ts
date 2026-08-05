/**
 * SOCKET — real-time client connection to the backend via socket.io.
 *
 * Key concepts: derives SOCKET_URL from NEXT_PUBLIC_API_URL by stripping the trailing
 * `/api` (the socket server sits at the host root, not under /api); getSocket() lazily
 * creates and memoises a single shared Socket (websocket with polling fallback,
 * withCredentials, autoConnect) reused everywhere; joinPatientRoom / leavePatientRoom
 * emit room events so a patient only receives their own live updates/alerts.
 * Viva line: "One shared socket connection and per-patient rooms mean real-time alerts reach exactly the right device."
 */
import { io, type Socket } from 'socket.io-client';

// The socket server is the API host without the trailing `/api`.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

// Single shared connection reused across the app.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function joinPatientRoom(patientId: string) {
  if (!patientId) return;
  getSocket().emit('join_room', { patientId });
}

export function leavePatientRoom(patientId: string) {
  if (!patientId || !socket) return;
  socket.emit('leave_room', { patientId });
}
