"use client";

import { useState, useTransition, useRef } from "react";
import { generateAiTicketReply } from "@/lib/actions/ai-actions";
import { Brain, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiReplyButton({ ticketId, onReply }: { ticketId: string; onReply: (text: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClick() {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const result = await generateAiTicketReply(ticketId);
      if (result.ok && result.reply) {
        onReply(result.reply);
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      } else {
        setError(result.error ?? "AI yanıt üretemedi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
      >
        {isPending ? (
          <><Loader2 size={13} className="animate-spin" />Yanıt üretiliyor...</>
        ) : done ? (
          <><Check size={13} className="text-emerald-400" />Eklendi</>
        ) : (
          <><Brain size={13} />AI ile Yanıt Üret</>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

export function AdminReplyFormWithAi({
  ticketId,
  replyAction,
  closeAction,
}: {
  ticketId: string;
  replyAction: (fd: FormData) => Promise<void>;
  closeAction: (fd: FormData) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleAiReply(text: string) {
    setMessage(text);
    textareaRef.current?.focus();
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium">Yanıt Yaz</span>
        <AiReplyButton ticketId={ticketId} onReply={handleAiReply} />
      </div>
      <form action={replyAction} className="p-4 space-y-3">
        <input type="hidden" name="ticketId" value={ticketId} />
        <textarea
          ref={textareaRef}
          name="message"
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Kullanıcıya yanıtınızı yazın... veya AI butonu ile otomatik üretin."
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex items-center justify-between gap-3">
          <form action={closeAction}>
            <input type="hidden" name="ticketId" value={ticketId} />
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Talebi Kapat
            </button>
          </form>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Yanıtla
          </button>
        </div>
      </form>
    </div>
  );
}
