"use client";

import { useState, useRef, useEffect } from "react";
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
          { role: "ai", content: `File "${file.name}" indexed successfully! You can now ask questions.` },
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
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>NotebookLM Clone</h1>
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "1rem" }}>
            Upload a document (PDF or TXT) to start a grounded conversation.
          </p>
          <label className="button" style={{ display: "block", textAlign: "center" }}>
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
            <div className="source-badge" style={{ marginTop: "1rem", width: "100%", textAlign: "center" }}>
              Active: {fileName}
            </div>
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Sources</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            Retrieved chunks will appear here after a query.
          </p>
          {messages.length > 0 && messages[messages.length - 1].sources && (
             <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {messages[messages.length - 1].sources?.map((s, i) => (
                  <div key={i} className="source-badge" style={{ fontSize: "0.7rem", whiteSpace: "normal" }}>
                    Chunk {i+1}: {s.content.substring(0, 100)}...
                  </div>
                ))}
             </div>
          )}
        </div>
      </div>

      <main className="main-content">
        <div className="chat-box glass">
          {messages.length === 0 && (
            <div style={{ textAlign: "center", marginTop: "20%", color: "var(--muted)" }}>
              <h2 style={{ color: "var(--foreground)", marginBottom: "1rem" }}>Welcome to Cognitive RAG</h2>
              <p>Your documents, intelligently indexed and ready to discuss.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role === "user" ? "user-message" : "ai-message"} fade-in`}>
              {m.content}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleAsk} className="glass" style={{ padding: "1rem", display: "flex", gap: "1rem" }}>
          <input
            className="input"
            placeholder={fileName ? "Ask anything about the document..." : "Upload a document first"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!fileName || isAsking}
          />
          <button className="button" type="submit" disabled={!fileName || isAsking || !query.trim()}>
            {isAsking ? "Thinking..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
