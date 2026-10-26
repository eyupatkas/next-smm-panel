"use client";

import { useState } from "react";
import { Search, MessageSquare, Calendar, User, UserCheck, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  visitorId: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string | null;
    role: string;
  } | null;
  messages: ChatMessage[];
}

interface Props {
  sessions: ChatSession[];
}

export default function AIChatsClient({ sessions: initialSessions }: Props) {
  const [sessions] = useState<ChatSession[]>(initialSessions);
  const [search, setSearch] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessions[0]?.id || null
  );

  const filteredSessions = sessions.filter((s) => {
    const term = search.toLowerCase();
    const visitorMatch = s.visitorId.toLowerCase().includes(term);
    const emailMatch = s.user?.email?.toLowerCase().includes(term) ?? false;
    const nameMatch = s.user?.name?.toLowerCase().includes(term) ?? false;
    return visitorMatch || emailMatch || nameMatch;
  });

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border/80 bg-card overflow-hidden shadow-xl">
      {/* ── Sol Sütun: Sohbet Listesi ── */}
      <div className="w-80 md:w-96 border-r border-border/60 flex flex-col min-h-0 bg-background/30">
        <div className="p-4 border-b border-border/60 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare size={18} className="text-violet-400" />
              Yapay Zeka Sohbetleri
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              {sessions.length} Oturum
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ziyaretçi veya e-posta ara..."
              className="pl-8 bg-background/50 border-border/60 focus-visible:ring-violet-500 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Aramayla eşleşen sohbet bulunamadı.
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              const lastMessage = session.messages[session.messages.length - 1]?.content || "Boş konuşma";
              const formattedDate = new Date(session.updatedAt).toLocaleString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              });

              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all duration-200 border text-xs space-y-1.5",
                    isSelected
                      ? "bg-violet-500/10 border-violet-500/30 text-foreground"
                      : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate text-foreground flex items-center gap-1.5">
                      {session.user ? (
                        <>
                          <User size={12} className="text-violet-400 shrink-0" />
                          <span className="truncate">{session.user.email}</span>
                        </>
                      ) : (
                        <>
                          <UserCheck size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{session.visitorId.slice(0, 15)}...</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formattedDate}</span>
                  </div>
                  
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">
                    {lastMessage}
                  </p>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">
                      {session.messages.length} mesaj
                    </span>
                    {session.user?.role === "ADMIN" && (
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1 rounded uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Sağ Sütun: Sohbet Geçmişi ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-background/10">
        {selectedSession ? (
          <>
            {/* Sohbet Üst Bilgi Alanı */}
            <div className="p-4 border-b border-border/60 flex items-center justify-between shrink-0 bg-background/25">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    {selectedSession.user ? (
                      <>
                        <User size={14} className="text-violet-400" />
                        {selectedSession.user.name || selectedSession.user.email}
                      </>
                    ) : (
                      <>
                        <UserCheck size={14} className="text-slate-400" />
                        Ziyaretçi ({selectedSession.visitorId.slice(0, 12)}...)
                      </>
                    )}
                  </h3>
                  {selectedSession.user && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-bold uppercase">
                      {selectedSession.user.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    Başlangıç: {new Date(selectedSession.createdAt).toLocaleString("tr-TR")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles size={11} />
                    Mesaj Sayısı: {selectedSession.messages.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Mesaj Listesi */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-muted/20">
              {selectedSession.messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]",
                      isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs",
                        isUser
                          ? "bg-violet-600 text-white"
                          : "bg-slate-800 text-violet-400 border border-violet-500/20"
                      )}
                    >
                      {isUser ? (
                        <User size={14} className="mx-auto" />
                      ) : (
                        <Bot size={14} className="mx-auto" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-sm border",
                          isUser
                            ? "bg-violet-600 border-violet-500/10 text-white rounded-tr-none"
                            : "bg-card border-border/80 text-foreground rounded-tl-none"
                        )}
                      >
                        {msg.content}
                      </div>
                      <p
                        className={cn(
                          "text-[9px] text-muted-foreground px-1",
                          isUser ? "text-right" : "text-left"
                        )}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare size={36} className="text-muted-foreground/30 mb-3 animate-pulse" />
            <p className="text-xs">İncelemek istediğiniz sohbet oturumunu sol menüden seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Yardımcı Input Bileşeni ──
function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
