"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SchedulerRunNowCardProps = {
  batchLimit: number;
  runAction: (formData: FormData) => Promise<void>;
  lastRunLabel?: string;
};

export function SchedulerRunNowCard({ batchLimit, runAction, lastRunLabel }: SchedulerRunNowCardProps) {
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const formData = new FormData();
    formData.set("limit", String(batchLimit));

    startTransition(async () => {
      try {
        await runAction(formData);
        toast.success("Scheduler senkronu baslatildi.");
      } catch {
        toast.error("Scheduler calistirilirken hata olustu.");
      }
    });
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 shadow-xl shadow-primary/5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Scheduler Kontrolu</p>
          <h3 className="text-2xl font-bold tracking-tight">Simdi Calistir</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Bekleyen saglayici siparislerini hemen tara, durumlarini guncelle ve varsa refund mantigini anlik calistir.
          </p>
          {lastRunLabel && <p className="text-xs text-muted-foreground">Son calisma: {lastRunLabel}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-background/80 px-4 py-2 text-xs text-muted-foreground">
            Varsayilan batch: {batchLimit}
          </div>
          <Button onClick={handleSubmit} disabled={pending} className="rounded-full px-6">
            {pending ? "Calisiyor..." : "Simdi Calistir"}
          </Button>
        </div>
      </div>
    </div>
  );
}