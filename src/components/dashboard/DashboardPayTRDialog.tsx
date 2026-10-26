"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PayTRIframe, type PayTRIframeResult } from "@/components/shared/PayTRIframe";
import { CreditCard, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  open: boolean;
  token: string | null;
  title?: string;
  description?: string;
  /** Ödeme sonucu netleştiğinde (kullanıcı henüz kapatmadan) haber verilir. */
  onResult?: (result: PayTRIframeResult) => void;
  /** Başarılı ödemeden sonra yönlendirilecek adres (verilmezse dialog açık kalır). */
  successRedirect?: string;
  onClose: () => void;
};

export function DashboardPayTRDialog({
  open,
  token,
  title = "PayTR ile Ödeme",
  description,
  onResult,
  successRedirect,
  onClose,
}: Props) {
  const [result, setResult] = useState<PayTRIframeResult | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [seenToken, setSeenToken] = useState<string | null>(null);

  // Yeni ödeme oturumunda (token değişince) sonucu sıfırla — render sırasında güvenli desen.
  if (token !== seenToken) {
    setSeenToken(token);
    setResult(null);
    setRedirecting(false);
  }

  const handleResult = useCallback(
    (next: PayTRIframeResult) => {
      if (result === "success") return;
      setResult(next);
      onResult?.(next);

      if (next === "success" && successRedirect) {
        setRedirecting(true);
        window.setTimeout(() => {
          window.location.href = successRedirect;
        }, 2500);
      }
    },
    [result, onResult, successRedirect],
  );

  const paid = result === "success";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent showCloseButton={false} className="w-full max-w-[96vw] sm:max-w-3xl border-white/10 bg-background p-0 overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CreditCard size={18} className="text-primary" />
              {title}
            </DialogTitle>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="Kapat">
            <X size={16} />
          </Button>
        </DialogHeader>

        {paid ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <CheckCircle2 size={56} className="text-emerald-500" />
            <p className="text-xl font-extrabold">Ödemeniz alındı</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {redirecting
                ? "Sipariş durumunuz açılıyor, lütfen bekleyin..."
                : "İşleminiz tamamlanıyor. Bu pencereyi kapatabilirsiniz."}
            </p>
            {redirecting && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
          </div>
        ) : (
          <>
            {result === "fail" && (
              <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>Ödeme tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyebilir ya da pencereyi kapatıp başka bir kartla devam edebilirsiniz.</span>
              </div>
            )}
            {token ? (
              <div className="flex-1 overflow-auto min-h-0">
                <PayTRIframe token={token} title="PayTR Güvenli Ödeme" iframeId="dashboard-paytr-iframe" minHeight={560} onResult={handleResult} />
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
