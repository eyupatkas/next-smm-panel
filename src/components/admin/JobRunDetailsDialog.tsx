"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type JobRunDetailsDialogProps = {
  details: string | null;
  label?: string;
};

export function JobRunDetailsDialog({ details, label = "Detay" }: JobRunDetailsDialogProps) {
  const parsed = useMemo(() => {
    if (!details) return null;

    try {
      return JSON.parse(details) as Array<Record<string, unknown>>;
    } catch {
      return null;
    }
  }, [details]);

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        {label}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Job Run Detayi</DialogTitle>
          <DialogDescription>
            Bu scheduler calismasinda islenen siparislerin sonuc listesi.
          </DialogDescription>
        </DialogHeader>

        {!parsed && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Detay verisi cozumlenemedi.
          </div>
        )}

        {parsed && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
            {parsed.map((item, index) => (
              <div key={`${item.orderId || index}`} className="rounded-2xl border border-border bg-card p-4">
                {(() => {
                  const errorText = typeof item.error === "string" ? item.error : "";

                  return (
                    <>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">Siparis: {String(item.orderId || "-")}</span>
                  <span className="text-muted-foreground">Saglayici: {String(item.providerName || "-")}</span>
                  <span className="text-muted-foreground">Durum: {String(item.status || "-")}</span>
                  <span className="text-muted-foreground">Gonderildi: {String(item.sent || false)}</span>
                  <span className="text-muted-foreground">Sync: {String(item.synced || false)}</span>
                  <span className="text-muted-foreground">Iade: {Number(item.refundedAmount || 0).toFixed(3)} TL</span>
                </div>
                {errorText && (
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-600 whitespace-pre-wrap">
                    {errorText}
                  </pre>
                )}
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}