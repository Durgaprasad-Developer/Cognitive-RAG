"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./globals.css";

type Message = {
  role: "user" | "ai";
  content: string;
  sources?: any[];
  modelUsed?: string;
};

type Session = {
  id: string;
  fileName: string;
  messages: Message[];
  timestamp: number;
};

export default function NotebookLM() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cognitive_rag_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("cognitive_rag_sessions", JSON.stringify(sessions));
    } else {
      localStorage.removeItem("cognitive_rag_sessions");
    }
  }, [sessions]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, activeSessionId, statusMessage]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage("Reading document...");
    const sessionId = Math.random().toString(36).substring(7);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("sessionId", sessionId);

    try {
      setTimeout(() => {
        if (isUploading) setStatusMessage("Generating embeddings...");
      }, 1000);
      setTimeout(() => {
        if (isUploading) setStatusMessage("Indexing in Qdrant Cloud...");
      }, 3000);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newSession: Session = {
          id: sessionId,
          fileName: file.name,
          messages: [{ role: "ai", content: `File **${file.name}** indexed successfully! You can now ask questions.` }],
          timestamp: Date.now(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(sessionId);
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error || "Timeout occurred. Try a smaller file."}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error uploading file.");
    } finally {
      setIsUploading(false);
      setStatusMessage("");
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAsking || isUploading || !activeSessionId) return;

    const userQuery = query;
    setQuery("");
    
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, { role: "user", content: userQuery }] }
          : s
      )
    );
    
    setIsAsking(true);
    setStatusMessage("Searching documents...");

    try {
      setTimeout(() => {
        if (isAsking) setStatusMessage("Consulting Gemini...");
      }, 1000);
      setTimeout(() => {
        if (isAsking) setStatusMessage("Processing through Orchestra...");
      }, 5000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery, sessionId: activeSessionId }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { 
                  ...s, 
                  messages: [
                    ...s.messages, 
                    { role: "ai", content: data.answer, sources: data.sources, modelUsed: data.modelUsed }
                  ] 
                }
              : s
          )
        );
      } else {
        const err = await res.json();
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, { role: "ai", content: `**Error:** ${err.error}` }] }
              : s
          )
        );
      }
    } catch (error) {
      console.error(error);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, { role: "ai", content: "Something went wrong. Please try again." }] }
            : s
        )
      );
    } finally {
      setIsAsking(false);
      setStatusMessage("");
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    }
  };

  return (
    <div className="container">
      <div className="sidebar glass">
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem", fontWeight: 700 }}>Cognitive RAG</h1>
        
        <div style={{ marginBottom: "2rem" }}>
          <label className={`button primary-btn ${isUploading || isAsking ? 'disabled' : ''}`} style={{ display: "block", textAlign: "center" }}>
            {isUploading ? "Indexing..." : "Upload New Document"}
            <input
              type="file"
              accept=".pdf,.txt"
              style={{ display: "none" }}
              onChange={handleFileUpload}
              disabled={isUploading || isAsking}
            />
          </label>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <h3 className="sidebar-title">Recent Chats</h3>
          <div className="sessions-list">
            {sessions.map((s) => (
              <div 
                key={s.id} 
                className={`session-item glass ${activeSessionId === s.id ? "active-session" : ""} ${isUploading || isAsking ? 'disabled' : ''}`}
                onClick={() => !isAsking && !isUploading && setActiveSessionId(s.id)}
              >
                <div className="session-info">
                  <div className="session-name">📄 {s.fileName}</div>
                  <div className="session-date">{new Date(s.timestamp).toLocaleDateString()}</div>
                </div>
                <button className="delete-btn" onClick={(e) => deleteSession(s.id, e)}>×</button>
              </div>
            ))}
          </div>
        </div>

        {activeSession && (
          <div className="sources-container">
            <h3 className="sidebar-title">Sources</h3>
            <div className="sources-list">
              {activeSession.messages[activeSession.messages.length - 1]?.sources?.map((src: any, idx: number) => (
                <div key={idx} className="source-card glass shadow-sm">
                  <div className="source-index">Chunk {idx + 1}</div>
                  <div className="source-snippet">{src.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="main-content">
        <div className="chat-box glass">
          {!activeSessionId ? (
            <div className="welcome-screen">
              <div className="logo-placeholder">🧠</div>
              <h2>Ready to investigate</h2>
              <p>Upload a document to begin your discovery.</p>
            </div>
          ) : (
            <>
              {activeSession?.messages.map((m, i) => (
                <div key={i} className={`message-wrapper ${m.role === "user" ? "user-wrapper" : "ai-wrapper"}`}>
                  <div className={`message ${m.role === "user" ? "user-message" : "ai-message"} shadow-sm`}>
                    <div className="prose">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {m.modelUsed && (
                      <div className="model-badge">
                        <span>Answered by</span> {m.modelUsed}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {statusMessage && (
                <div className="message-wrapper ai-wrapper fade-in">
                  <div className="message ai-message status-message">
                    <span className="dot-typing"></span>
                    {statusMessage}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className={`input-container glass shadow-lg ${isAsking || isUploading ? 'input-blocked' : ''}`}>
          <form onSubmit={handleAsk} style={{ display: "flex", gap: "1rem" }}>
            <input
              className="input"
              placeholder={
                isUploading 
                ? "Indexing document... please wait" 
                : isAsking 
                  ? "Agent is thinking..." 
                  : activeSessionId 
                    ? "Ask anything about the document..." 
                    : "Select or upload a document"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!activeSessionId || isAsking || isUploading}
            />
            <button className="button send-btn" type="submit" disabled={!activeSessionId || isAsking || isUploading || !query.trim()}>
              {isAsking || isUploading ? "..." : "Send"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
