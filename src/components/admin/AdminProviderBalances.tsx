"use client";

import { useEffect, useState, useCallback } from "react";
import { Server, RefreshCw, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProviderBalance {
  id: string;
  name: string;
  balance: number;
  baseCurrency: string;
  updatedAt: string;
  error?: string;
}

const POLL_INTERVAL = 60_000; // 60 seconds

export function AdminProviderBalances() {
  const [providers, setProviders] = useState<ProviderBalance[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/provider-balances");
      if (!res.ok) return;
      const data: ProviderBalance[] = await res.json();
      setProviders(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    void fetchBalances();
    const timer = setInterval(() => { void fetchBalances(); }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchBalances]);

  const totalUSD = providers.filter((p) => p.baseCurrency === "USD").reduce((s, p) => s + p.balance, 0);
  const totalTRY = providers.filter((p) => p.baseCurrency === "TRY").reduce((s, p) => s + p.balance, 0);
  const lowBalance = providers.some((p) => p.balance < 10);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative flex items-center gap-2 px-3 h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm">
        <Server size={14} className={lowBalance ? "text-amber-400" : "text-emerald-400"} />
        <span className={`hidden sm:block text-xs font-mono font-medium ${lowBalance ? "text-amber-300" : "text-emerald-300"}`}>
          {providers.length > 0 ? (
            <>
              {totalUSD > 0 && `$${totalUSD.toFixed(2)}`}
              {totalUSD > 0 && totalTRY > 0 && " · "}
              {totalTRY > 0 && `₺${totalTRY.toFixed(2)}`}
              {totalUSD === 0 && totalTRY === 0 && "—"}
            </>
          ) : "—"}
        </span>
        {loading && <RefreshCw size={10} className="animate-spin text-muted-foreground" />}
        {lowBalance && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] p-0 border border-white/[0.08] bg-card shadow-xl rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Sağlayıcı Bakiyeleri</h3>
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Güncellendi: {lastUpdated.toLocaleTimeString("tr-TR")}
              </p>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); void fetchBalances(); }}
            disabled={loading}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Provider list */}
        <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
          {providers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Yükleniyor...</p>
          )}
          {providers.map((p) => {
            const isLow = p.balance < 10;
            const hasError = !!p.error;
            return (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasError ? "bg-red-500/10" : isLow ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                    <Server size={12} className={hasError ? "text-red-400" : isLow ? "text-amber-400" : "text-emerald-400"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleDateString("tr-TR")} güncellendi
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {hasError ? (
                    <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={11} />API hatası</p>
                  ) : (
                    <div className={`flex items-center gap-1 font-mono text-sm font-semibold ${isLow ? "text-amber-400" : "text-emerald-400"}`}>
                      {isLow ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                      {p.balance.toFixed(2)} {p.baseCurrency}
                    </div>
                  )}
                  {!hasError && isLow && (
                    <p className="text-[10px] text-amber-500 mt-0.5">Düşük bakiye!</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        {providers.length > 1 && (
          <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{providers.length} sağlayıcı</span>
              <span className="font-mono text-slate-300">
                {totalUSD > 0 && `$${totalUSD.toFixed(2)}`}
                {totalUSD > 0 && totalTRY > 0 && " · "}
                {totalTRY > 0 && `₺${totalTRY.toFixed(2)}`}
              </span>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
