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
