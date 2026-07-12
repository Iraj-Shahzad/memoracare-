"use client";

import Topbar from "@/components/shared/Topbar";
import CaregiverSidebar from "@/components/shared/CaregiverSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useState, useEffect } from "react";

interface Patient {
  _id: string;
  name: string;
}

interface Note {
  _id: string;
  patientName: string;
  patient: string;
  text: string;
  content: string;
  date: string;
  type: string;
}

export default function NotesPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await apiGet("/caregiver/my-patients");
        const data = res.data || res.patients || res || [];
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((p: Record<string, unknown>) => ({ _id: (p._id || p.id) as string, name: p.name as string }));
        setPatients(mapped);
        if (mapped.length > 0) {
          setSelectedPatientId(mapped[0]._id);
          setSelectedPatientName(mapped[0].name);
        }
      } catch {
        // patients remain empty
      }
    };
    fetchPatients();
  }, []);

  // Fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiGet("/caregiver/notes");
        const data = res.data || res.notes || res || [];
        const list = Array.isArray(data) ? data : [];
        setNotes(list.map((n: Record<string, unknown>) => ({
          _id: (n._id || n.id || '') as string,
          patientName: (n.patientName || (typeof n.patient === 'object' && n.patient !== null ? (n.patient as Record<string, unknown>).name : '')) as string,
          patient: (typeof n.patient === 'string' ? n.patient : (typeof n.patient === 'object' && n.patient !== null ? ((n.patient as Record<string, unknown>)._id || (n.patient as Record<string, unknown>).id) : '')) as string,
          text: (n.text || n.content || '') as string,
          content: (n.content || n.text || '') as string,
          date: (n.date || n.createdAt || '') as string,
          type: (n.type || 'observation') as string,
        })));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load notes";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const patientNotes = notes.filter((note) => {
    if (selectedPatientId) {
      return note.patient === selectedPatientId || note.patientName === selectedPatientName;
    }
    return note.patientName === selectedPatientName;
  });

  const handleAddNote = async () => {
    if (newNote.trim() && selectedPatientId) {
      try {
        await apiPost("/caregiver/notes", { patient: selectedPatientId, content: newNote, type: "observation" });
        setNewNote("");
        // Re-fetch notes
        const res = await apiGet("/caregiver/notes");
        const data = res.data || res.notes || res || [];
        const list = Array.isArray(data) ? data : [];
        setNotes(list.map((n: Record<string, unknown>) => ({
          _id: (n._id || n.id || '') as string,
          patientName: (n.patientName || (typeof n.patient === 'object' && n.patient !== null ? (n.patient as Record<string, unknown>).name : '')) as string,
          patient: (typeof n.patient === 'string' ? n.patient : (typeof n.patient === 'object' && n.patient !== null ? ((n.patient as Record<string, unknown>)._id || (n.patient as Record<string, unknown>).id) : '')) as string,
          text: (n.text || n.content || '') as string,
          content: (n.content || n.text || '') as string,
          date: (n.date || n.createdAt || '') as string,
          type: (n.type || 'observation') as string,
        })));
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to add note");
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await apiDelete(`/caregiver/notes/${noteId}`);
      setNotes(notes.filter((n) => n._id !== noteId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPatientId(id);
    const found = patients.find(p => p._id === id);
    setSelectedPatientName(found?.name || "");
  };

  const firstName = user?.name?.split(" ")[0] || "Caregiver";
  const userInitials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CG";

  return (
    <ProtectedRoute allowedRoles={["caregiver"]}>
    <div className="flex min-h-screen bg-[#f0fdf4]">
      <CaregiverSidebar />

      <div className="flex-1 ml-[260px] flex flex-col">
        <Topbar
          title="Notes"
          subtitle="Document observations and patient insights"
          greeting={`Good Morning, ${firstName}`}
          avatar={userInitials}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            {/* Patient Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={handlePatientChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
              >
                {patients.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Add Note Section */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="font-bold text-[#1a3c34] mb-4">Add New Note</h3>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write your observations and notes about the patient..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent resize-none"
                rows={4}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg text-sm font-semibold hover:bg-[#0a7a70] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Note
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-[#0d9488] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#64748b]">Loading notes...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-2">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[#0d9488] font-semibold text-sm">Retry</button>
              </div>
            ) : (
            /* Notes List */
            <div>
              <h3 className="font-bold text-[#1a3c34] mb-4">
                Notes for {selectedPatientName}
              </h3>
              <div className="space-y-4">
                {patientNotes.length > 0 ? (
                  patientNotes.map((note) => (
                    <div
                      key={note._id}
                      className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {note.date}
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-4 h-4"
                            >
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note._id)}
                            className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-4 h-4"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{note.text || note.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                    <p className="text-slate-600">
                      No notes yet for {selectedPatientName}. Add your first observation above.
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
