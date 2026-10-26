"use client";

import { useTransition } from "react";
import { stopImpersonation } from "@/lib/actions/impersonation-actions";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  impersonatedName: string;
  impersonatedEmail: string;
};

export function ImpersonationBanner({ impersonatedName, impersonatedEmail }: Props) {
  const [pending, start] = useTransition();

  function handleStop() {
    start(() => stopImpersonation());
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-amber-300 shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <ShieldAlert size={16} className="shrink-0" />
        <span className="font-semibold">Admin Modu</span>
        <span className="text-amber-400/70">—</span>
        <span>
          <span className="font-medium">{impersonatedName}</span>
          <span className="text-amber-400/70 ml-1.5 text-xs">({impersonatedEmail})</span>
        </span>
        <span className="text-amber-400/70 text-xs">olarak görüntülüyorsunuz</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 h-7 px-3 text-xs border border-amber-500/30 shrink-0"
        onClick={handleStop}
        disabled={pending}
      >
        {pending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <ArrowLeft size={12} />
        )}
        Admin Paneline Dön
      </Button>
    </div>
  );
}
