"use client";

import { useActionState, useEffect, useState } from "react";
import { requestRefill, type RefillOrderState } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Loader2, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  orderId: string;
  lastRefillAt: string | null;
};

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const initialState: RefillOrderState = {};

function getMsLeft(lastRefillAt: string | null): number {
  if (!lastRefillAt) return 0;
  const passed = Date.now() - new Date(lastRefillAt).getTime();
  return Math.max(0, COOLDOWN_MS - passed);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}s ${m.toString().padStart(2, "0")}d ${s.toString().padStart(2, "0")}sn`;
  if (m > 0) return `${m}d ${s.toString().padStart(2, "0")}sn`;
  return `${s}sn`;
}

function CooldownBadge({ msLeft }: { msLeft: number }) {
  const progress = 1 - msLeft / COOLDOWN_MS;
  const totalSec = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-2 py-1">
      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
        <circle cx="10" cy="10" r={radius} fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          stroke="rgb(245,158,11)"
          strokeWidth="2.5"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] font-mono font-bold text-amber-400 tabular-nums">
        {h > 0 ? `${h}s ${m.toString().padStart(2, "0")}d` : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`}
      </span>
    </div>
  );
}

export function RefillOrderButton({ orderId, lastRefillAt }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(requestRefill, initialState);
  const [msLeft, setMsLeft] = useState(() => getMsLeft(lastRefillAt));

  useEffect(() => {
    if (msLeft <= 0) return;
    const timer = setInterval(() => setMsLeft(getMsLeft(lastRefillAt)), 1000);
    return () => clearInterval(timer);
  }, [lastRefillAt]);

  useEffect(() => {
    if (state.success && open) {
      const t = setTimeout(() => setOpen(false), 1800);
      return () => clearTimeout(t);
    }
  }, [state.success, open]);

  const onCooldown = msLeft > 0;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {onCooldown && <CooldownBadge msLeft={msLeft} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          variant="outline"
          size="sm"
          disabled={onCooldown}
          onClick={() => !onCooldown && setOpen(true)}
          title={onCooldown ? `${formatCountdown(msLeft)} sonra tekrar kullanılabilir` : "Telafi isteği gönder"}
          className={cn(
            "gap-1.5 text-xs h-8 px-2.5 transition-all",
            onCooldown
              ? "border-amber-500/20 text-amber-500/40 bg-transparent cursor-not-allowed"
              : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/60 hover:text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
          )}
        >
          {onCooldown ? <Clock size={11} /> : <RefreshCw size={11} />}
          {onCooldown ? "Bekleniyor" : "Telafi Et"}
        </Button>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw size={18} className="text-emerald-400" />
              Telafi İsteği Gönder
            </DialogTitle>
            <DialogDescription>
              Bu sipariş için telafi (refill) talebi oluşturulacaktır.
              Her sipariş için 24 saatte bir telafi talep edilebilir.
            </DialogDescription>
          </DialogHeader>

          {state.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {state.error}
            </div>
          )}
          {state.success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> {state.success}
            </div>
          )}

          {!state.success && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <p className="text-sm font-medium">Ne olacak?</p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                {["Telafi talebi sağlayıcıya iletilir", "Eksik kalan miktar yeniden başlatılır", "24 saat sonra tekrar talep edilebilir"].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!state.success && (
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Vazgeç</Button>
              <form action={formAction}>
                <input type="hidden" name="orderId" value={orderId} />
                <Button type="submit" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={pending}>
                  {pending ? <><Loader2 size={14} className="animate-spin" /> Gönderiliyor...</> : <><RefreshCw size={14} /> Telafi İste</>}
                </Button>
              </form>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
