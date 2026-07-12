/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useEffect } from "react";
import PatientSidebar from "@/components/shared/PatientSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";

interface ChatMessage {
  id: string;
  type: "bot" | "user";
  content: string | React.ReactNode;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  preview: string;
  date: string;
}

export default function ChatbotPage() {
  const { user } = useAuth();
  const patientId = (user?.profile as any)?._id || user?.id;
  const userName = user?.name || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "bot",
      content:
        `Assalam o Alaikum, ${userName}! I'm your MemoraCare assistant. I can help you with your medications, routines, family information, and more. How can I help you today?`,
      timestamp: "1:10 PM",
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [selectedChat, setSelectedChat] = useState("today");
  const [searchValue, setSearchValue] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "today",
      title: "Today's Medications",
      preview: "What medications do I need to take today?",
      date: "Today, 1:15 PM",
    },
    {
      id: "family",
      title: "Family Members",
      preview: "Can you tell me about my daughter?",
      date: "Today, 10:30 AM",
    },
    {
      id: "morning",
      title: "Morning Routine Help",
      preview: "What should I do after breakfast?",
      date: "Yesterday, 8:45 AM",
    },
    {
      id: "doctor",
      title: "Doctor Appointment",
      preview: "When is my next appointment?",
      date: "Apr 10, 2026",
    },
    {
      id: "foods",
      title: "Favorite Foods",
      preview: "What are my favorite dishes?",
      date: "Apr 9, 2026",
    },
  ]);

  useEffect(() => {
    if (!patientId) return;
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const res = await apiGet(`/chat/patient/${patientId}/history`).catch(() => null);
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((msg: any, idx: number) => ({
            id: String(idx + 1),
            type: msg.role === "assistant" ? "bot" : "user",
            content: msg.content || msg.message || "",
            timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
          }));
          setMessages(mapped);
        }
      } catch (err) {
        console.error("Chat history error:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [patientId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return;

    const newUserMessage: ChatMessage = {
      id: String(messages.length + 1),
      type: "user",
      content: inputValue,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, newUserMessage]);
    const messageText = inputValue;
    setInputValue("");
    setSending(true);

    try {
      const res = await apiPost("/chat/message", {
        message: messageText,
        patient: patientId,
      });

      const botResponse: ChatMessage = {
        id: String(messages.length + 2),
        type: "bot",
        content: res?.data?.response || "I understand. Let me help you with that. How else can I assist you today?",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (err) {
      console.error("Chat error:", err);
      const botResponse: ChatMessage = {
        id: String(messages.length + 2),
        type: "bot",
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botResponse]);
    } finally {
      setSending(false);
    }
  };

  const medList = [
    { name: "Aricept 10mg", time: "8:00 AM", status: "Taken", done: true },
    { name: "Namenda 5mg", time: "9:00 AM", status: "Taken", done: true },
    { name: "Vitamin E 400 IU", time: "8:00 AM", status: "Taken", done: true },
    { name: "Aricept 10mg", time: "2:00 PM", status: "Upcoming", done: false },
    {
      name: "Galantamine 8mg",
      time: "6:00 PM",
      status: "Upcoming",
      done: false,
    },
    { name: "Melatonin 3mg", time: "9:30 PM", status: "Upcoming", done: false },
  ];

  const renderBotAvatar = () => (
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "linear-gradient(135deg, #1a3c34, #0d9488)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        style={{
          width: 18,
          height: 18,
          stroke: "#fff",
          fill: "none",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    </div>
  );

  const renderMessageContent = (message: ChatMessage) => {
    if (message.content === "MED_LIST") {
      return (
        <div>
          Here are your medications for today, {userName}:
          <div style={{ marginTop: 10 }}>
            {medList.map((med, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom:
                    idx < medList.length - 1 ? "1px solid #f1f5f9" : "none",
                  fontSize: 13,
                }}
              >
                {med.done ? (
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      stroke: "#16a34a",
                      fill: "none",
                      strokeWidth: 2,
                    }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      stroke: "#d97706",
                      fill: "none",
                      strokeWidth: 2,
                    }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
                <span>
                  <strong>{med.name}</strong> - {med.time} ({med.status})
                </span>
              </div>
            ))}
          </div>
          You&apos;ve taken 3 out of 6 doses so far. Your next medication is
          Aricept 10mg at 2:00 PM.
        </div>
      );
    }
    return <>{message.content}</>;
  };

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
    <div className="flex" style={{ height: "100vh", background: "#f5f6f5" }}>
      <PatientSidebar />

      <main className="flex-1 ml-[260px] flex flex-col" style={{ height: "100vh" }}>
        <div className="flex flex-1 overflow-hidden">
          {/* Chat History Panel */}
          <div
            className="flex flex-col overflow-hidden"
            style={{
              width: 280,
              background: "#fff",
              borderRight: "1px solid #e2e8f0",
            }}
          >
            {/* History Header */}
            <div
              style={{
                padding: 20,
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1a3c34",
                }}
              >
                Chat History
              </h3>
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 18,
                    height: 18,
                    stroke: "#64748b",
                    fill: "none",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                  }}
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                  background: "#f8fafc",
                }}
              />
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto" style={{ padding: 8 }}>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedChat(conv.id)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    cursor: "pointer",
                    marginBottom: 4,
                    background:
                      selectedChat === conv.id ? "#f0fdf4" : "transparent",
                    border:
                      selectedChat === conv.id
                        ? "1px solid #d1fae5"
                        : "1px solid transparent",
                  }}
                >
                  <h4
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1a3c34",
                      marginBottom: 4,
                    }}
                  >
                    {conv.title}
                  </h4>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {conv.preview}
                  </p>
                  <div
                    style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}
                  >
                    {conv.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Topbar */}
            <div
              style={{
                padding: "16px 24px",
                background: "#fff",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: "linear-gradient(135deg, #1a3c34, #0d9488)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 22,
                      height: 22,
                      stroke: "#fff",
                      fill: "none",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    }}
                  >
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#1a3c34",
                    }}
                  >
                    MemoraCare Assistant
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#16a34a",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        background: "#16a34a",
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    />
                    Online
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  title="Voice Input"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 18,
                      height: 18,
                      stroke: "#64748b",
                      fill: "none",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    }}
                  >
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
                <button
                  title="Clear Chat"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 18,
                      height: 18,
                      stroke: "#64748b",
                      fill: "none",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    }}
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    maxWidth: "75%",
                    alignSelf:
                      message.type === "user" ? "flex-end" : "flex-start",
                    flexDirection:
                      message.type === "user" ? "row-reverse" : "row",
                  }}
                >
                  {/* Avatar */}
                  {message.type === "bot" ? (
                    renderBotAvatar()
                  ) : (
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "#0d9488",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {initials}
                    </div>
                  )}

                  <div>
                    <div
                      style={{
                        padding: "14px 18px",
                        borderRadius: 16,
                        fontSize: 14,
                        lineHeight: 1.6,
                        ...(message.type === "bot"
                          ? {
                              background: "#fff",
                              border: "1px solid #e2e8f0",
                              borderBottomLeftRadius: 4,
                              color: "#1a3c34",
                            }
                          : {
                              background: "#0d9488",
                              color: "#fff",
                              borderBottomRightRadius: 4,
                            }),
                      }}
                    >
                      {renderMessageContent(message)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 4,
                        padding: "0 4px",
                        ...(message.type === "user"
                          ? { textAlign: "right" as const }
                          : {}),
                      }}
                    >
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div style={{ display: "flex", gap: 12, alignSelf: "flex-start" }}>
                  {renderBotAvatar()}
                  <div style={{ padding: "14px 18px", borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0", borderBottomLeftRadius: 4 }}>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div
              style={{
                padding: "16px 24px",
                background: "#fff",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 12,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "8px 8px 8px 18px",
                }}
              >
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message or ask me anything..."
                  rows={1}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: 14,
                    color: "#1a3c34",
                    background: "transparent",
                    resize: "none",
                    minHeight: 24,
                    maxHeight: 120,
                    lineHeight: 1.5,
                    padding: "4px 0",
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    title="Voice Input"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      style={{
                        width: 20,
                        height: 20,
                        stroke: "#64748b",
                        fill: "none",
                        strokeWidth: 2,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      }}
                    >
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={sending}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      border: "none",
                      background: sending ? "#94a3b8" : "#0d9488",
                      cursor: sending ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      style={{
                        width: 18,
                        height: 18,
                        stroke: "#fff",
                        fill: "none",
                        strokeWidth: 2,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      }}
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                MemoraCare AI provides helpful reminders but is not a substitute
                for medical advice.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
