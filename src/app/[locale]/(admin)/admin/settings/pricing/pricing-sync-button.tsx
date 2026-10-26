"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { syncPackagePricesToGuard } from "@/lib/actions/pricing-actions";
import { Loader2, RefreshCw } from "lucide-react";

export function PricingSyncButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await syncPackagePricesToGuard();
        if (res.disabled) {
          setResult("Guard kapalı — önce açıp kaydedin.");
        } else {
          setResult(`${res.checked} paket kontrol edildi, ${res.updated} paketin fiyatı tabana çekildi.`);
        }
      } catch {
        setResult("Senkron sırasında hata oluştu.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleSync} disabled={pending || disabled} className="gap-2 rounded-full">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        Tüm Paketlere Şimdi Uygula
      </Button>
      {result ? <p className="text-xs text-muted-foreground">{result}</p> : null}
    </div>
  );
}
