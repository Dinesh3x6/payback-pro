"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, Sparkles, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { AIEngine } from "@/lib/ai-engine";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<AIEngine | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize Engine
  useEffect(() => {
    if (!open && !engine) return;
    if (engine) return;
    
    setLoading(true);
    apiGet<any[]>("/borrowers")
      .then(borrowers => {
        const ai = new AIEngine({ borrowers });
        setEngine(ai);
        setMessages([{ id: "init", sender: "ai", text: ai.query("hello") }]);
      })
      .catch(() => {
        setMessages([{ id: "err", sender: "ai", text: "Warning: Failed to load portfolio data. AI insights may be limited." }]);
      })
      .finally(() => setLoading(false));
  }, [open, engine]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || !engine) return;

    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text: q }]);
    setInput("");
    
    // Simulate slight delay to feel like "AI thinking"
    setLoading(true);
    setTimeout(() => {
      const response = engine.query(q);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), sender: "ai", text: response }]);
      setLoading(false);
    }, 600);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-ink dark:bg-paper text-white dark:text-ink rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50 ${open ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <Sparkles size={24} />
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-6 right-6 w-80 sm:w-96 bg-paper dark:bg-ink-dark border border-line dark:border-ink-light shadow-2xl rounded-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`} style={{ height: "500px", maxHeight: "80vh" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line dark:border-ink-light bg-paper-muted dark:bg-ink rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-moss/20 text-moss flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">PayBack AI</h3>
              <p className="text-[10px] text-ink-muted">Smart Financial Assistant</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink transition">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender === "user" 
                  ? "bg-ink text-white dark:bg-paper dark:text-ink rounded-br-sm" 
                  : "bg-paper-muted dark:bg-ink text-ink dark:text-paper rounded-bl-sm border border-line dark:border-ink-light"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-paper-muted dark:bg-ink rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-ink-muted" />
                <span className="text-xs text-ink-muted">AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-line dark:border-ink-light bg-paper dark:bg-ink-dark rounded-b-2xl">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
            <input 
              type="text" 
              placeholder="Ask about your portfolio..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 bg-paper-muted dark:bg-ink border border-line dark:border-ink-light rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-moss/50 transition"
              disabled={loading || !engine}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || loading || !engine}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-moss text-white flex items-center justify-center disabled:opacity-50 transition"
            >
              <Send size={14} className="ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
