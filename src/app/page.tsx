"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./globals.css";

type Message = {
  role: "user" | "ai";
  content: string;
  sources?: any[];
};

export default function NotebookLM() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `File **${file.name}** indexed successfully! You can now ask questions.` },
        ]);
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error uploading file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAsking) return;

    const userQuery = query;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsAsking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: data.answer, sources: data.sources },
        ]);
      } else {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Error: ${err.error}` },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="container">
      <div className="sidebar glass">
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem", fontWeight: 700 }}>Cognitive RAG</h1>
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            Unlock insights from your documents with grounded AI.
          </p>
          <label className="button primary-btn" style={{ display: "block", textAlign: "center" }}>
            {isUploading ? "Indexing..." : "Upload Document"}
            <input
              type="file"
              accept=".pdf,.txt"
              style={{ display: "none" }}
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
          {fileName && (
            <div className="source-badge active-file" style={{ marginTop: "1rem" }}>
              📄 {fileName}
            </div>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: "auto" }}>
          <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "1rem" }}>
            Sources
          </h3>
          {(!messages.length || !messages[messages.length - 1].sources) && (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>
              Retrieved chunks will appear here.
            </p>
          )}
          {messages.length > 0 && messages[messages.length - 1].sources && (
             <div className="sources-list">
                {messages[messages.length - 1].sources?.map((s, i) => (
                  <div key={i} className="source-card glass">
                    <div className="source-index">Chunk {i+1}</div>
                    <div className="source-snippet">{s.content}</div>
                  </div>
                ))}
             </div>
          )}
        </div>
      </div>

      <main className="main-content">
        <div className="chat-box glass">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <div className="logo-placeholder">🧠</div>
              <h2>Start your conversation</h2>
              <p>Upload a PDF or Text file to begin asking questions grounded in your data.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message-wrapper ${m.role === "user" ? "user-wrapper" : "ai-wrapper"}`}>
              <div className={`message ${m.role === "user" ? "user-message" : "ai-message"} shadow-sm`}>
                <ReactMarkdown className="prose">{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-container glass shadow-lg">
          <form onSubmit={handleAsk} style={{ display: "flex", gap: "1rem" }}>
            <input
              className="input"
              placeholder={fileName ? "Ask anything about the document..." : "Upload a document first"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!fileName || isAsking}
            />
            <button className="button send-btn" type="submit" disabled={!fileName || isAsking || !query.trim()}>
              {isAsking ? "Thinking..." : "Send"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
