"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { cancelOrder, type CancelOrderState } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { XCircle, Loader2, AlertTriangle } from "lucide-react";

type Props = {
  orderId: string;
  chargeLabel: string;
};

const initialState: CancelOrderState = {};

export function CancelOrderButton({ orderId, chargeLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(cancelOrder, initialState);

  useEffect(() => {
    // Sadece anında iptal (pending değil) durumunda dialogu kapat
    if (state.success && !state.cancelPending && open) {
      queueMicrotask(() => setOpen(false));
    }
  }, [open, state.success, state.cancelPending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs h-7 px-2"
          />
        }
      >
        <XCircle size={12} />
        İptal
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            Siparişi İptal Et
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Bu siparişi iptal etmek istediğinizden emin misiniz?
            Teslim edilmemiş kısım bakiyenize iade edilecektir.
          </DialogDescription>
        </DialogHeader>

        {state.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {state.error}
          </div>
        )}

        {state.success && state.cancelPending && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 space-y-1">
            <p className="font-semibold">{state.success}</p>
            <p>İptal onayı sonrası iade otomatik olarak bakiyenize eklenecektir.</p>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm space-y-1">
          <p className="text-muted-foreground">Sipariş tutarı: <span className="text-foreground font-semibold">{chargeLabel}</span></p>
          <p className="text-xs text-muted-foreground">İade miktarı teslim edilmemiş kısmı kapsar.</p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <form action={formAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <Button
              type="submit"
              variant="destructive"
              className="gap-2"
              disabled={pending}
            >
              {pending ? (
                <><Loader2 size={14} className="animate-spin" /> İptal ediliyor...</>
              ) : (
                <><XCircle size={14} /> Siparişi İptal Et</>
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
