"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Wrench } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* Animated background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-lg shadow-primary/10">
          <Wrench size={36} className="text-primary" />
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Bakım Çalışması
        </span>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Kısa Süreliğine Bakımdayız
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sizi daha iyi hizmet etmek için çalışmalar yürütüyoruz. En kısa sürede geri döneceğiz.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/5" />

        {/* Info row */}
        <div className="flex w-full flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Durum</span>
            <span className="flex items-center gap-1.5 font-medium text-amber-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              Bakım Modu
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tahmini Süre</span>
            <span className="font-medium text-foreground">Çok kısa süre</span>
          </div>
        </div>

        {/* Retry button */}
        <button
          onClick={reset}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-95"
        >
          <RefreshCw size={15} />
          Tekrar Dene
        </button>

        <p className="text-xs text-muted-foreground">
          Sorun devam ederse{" "}
          <Link href="/dashboard/support" className="text-primary underline underline-offset-2">
            destek ile iletişime
          </Link>{" "}
          geçebilirsiniz.
        </p>
      </div>
    </div>
  );
}
