"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Sparkles,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { bulkRepricePackagesAdmin } from "@/lib/actions/admin-actions";
import {
  recommendPackagePricing,
  type PackagePricingRecommendation,
  type PackageProfitability,
} from "@/lib/services/package-profitability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BulkPricingPackage = {
  id: string;
  name: string;
  price: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  quantity: number;
  service: { name: string };
  profitability: PackageProfitability;
  suggestedPricing: PackagePricingRecommendation | null;
};

type PricingScope = "loss" | "risk" | "all";

type Props = {
  packages: BulkPricingPackage[];
  markupSettings: {
    retailMarkupPercent: number;
    resellerMarkupPercent: number;
  };
};

function formatPrice(value: number | null) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export function AdminPackagePricingTab({ packages, markupSettings }: Props) {
  const router = useRouter();
  const [scope, setScope] = useState<PricingScope>("loss");
  const [retailMarkup, setRetailMarkup] = useState(String(markupSettings.retailMarkupPercent));
  const [resellerMarkup, setResellerMarkup] = useState(String(markupSettings.resellerMarkupPercent));
  const [onlyIncrease, setOnlyIncrease] = useState(true);
  const [deselectedIds, setDeselectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const retailMarkupValue = Math.max(0, Number(retailMarkup) || 0);
  const resellerMarkupValue = Math.max(0, Number(resellerMarkup) || 0);

  const rows = useMemo(() => {
    return packages
      .map((pkg) => ({
        pkg,
        recommendation: recommendPackagePricing({
          profitability: pkg.profitability,
          price: pkg.price,
          retailPrice: pkg.retailPrice,
          resellerPrice: pkg.resellerPrice,
          retailMarkupPercent: retailMarkupValue,
          resellerMarkupPercent: resellerMarkupValue,
          onlyIncrease,
        }),
      }))
      .filter(({ pkg, recommendation }) => {
        if (!recommendation) {
          return false;
        }

        switch (scope) {
          case "loss":
            return pkg.profitability.isLossMaking;
          case "risk":
            return pkg.profitability.isLossMaking || pkg.profitability.isLowMargin;
          default:
            return true;
        }
      })
      .sort((left, right) => {
        const riskWeight = Number(right.pkg.profitability.isLossMaking) - Number(left.pkg.profitability.isLossMaking);
        if (riskWeight !== 0) {
          return riskWeight;
        }

        return (right.recommendation?.totalLift ?? 0) - (left.recommendation?.totalLift ?? 0);
      });
  }, [onlyIncrease, packages, resellerMarkupValue, retailMarkupValue, scope]);

  const candidateRows = useMemo(
    () => rows.filter((row) => row.recommendation?.needsUpdate),
    [rows]
  );
  const candidateIds = useMemo(
    () => candidateRows.map((row) => row.pkg.id),
    [candidateRows]
  );
  const deselectedSet = useMemo(() => new Set(deselectedIds), [deselectedIds]);
  const selectedIds = useMemo(
    () => candidateIds.filter((id) => !deselectedSet.has(id)),
    [candidateIds, deselectedSet]
  );
  const selectedSet = useMemo(
    () => new Set(selectedIds),
    [selectedIds]
  );
  const selectedRows = useMemo(
    () => candidateRows.filter((row) => selectedSet.has(row.pkg.id)),
    [candidateRows, selectedSet]
  );

  const projectedLift = selectedRows.reduce(
    (sum, row) => sum + (row.recommendation?.totalLift ?? 0),
    0
  );

  const lossCount = packages.filter((pkg) => pkg.profitability.isLossMaking).length;
  const riskCount = packages.filter(
    (pkg) => pkg.profitability.isLossMaking || pkg.profitability.isLowMargin
  ).length;
  const unknownCount = packages.filter((pkg) => pkg.profitability.hasMissingCost).length;

  function toggleSelection(id: string, checked: boolean) {
    setDeselectedIds((current) => {
      if (checked) {
        return current.filter((item) => item !== id);
      }
      return current.includes(id) ? current : [...current, id];
    });
  }

  function applyTo(ids: string[], label: string) {
    const scopedIds = ids.filter((id) => candidateIds.includes(id));

    if (scopedIds.length === 0) {
      toast.error("Uygulanacak paket bulunamadı.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await bulkRepricePackagesAdmin({
          packageIds: scopedIds,
          retailMarkupPercent: retailMarkupValue,
          resellerMarkupPercent: resellerMarkupValue,
          onlyIncrease,
        });

        if (result.updatedCount === 0) {
          toast.message(`${label} için yeni fiyat gerekmiyor.`);
          router.refresh();
          return;
        }

        toast.success(`${result.updatedCount} paket güncellendi. Toplam fiyat artışı: ${formatPrice(result.totalLift)}`);
        router.refresh();
      } catch {
        toast.error("Toplu fiyat güncellemesi başarısız oldu.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-card/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Kar / zarar optimizasyonu</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight">Toplu fiyat ayarlama merkezi</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Paket maliyetini servis sağlayıcı fiyatlarından hesaplar, seçili kapsam için önerilen perakende ve bayi fiyatlarını uygular.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Perakende: %{markupSettings.retailMarkupPercent}</Badge>
            <Badge variant="outline">Bayi: %{markupSettings.resellerMarkupPercent}</Badge>
            <Badge variant="outline">Maliyet eksik: {unknownCount}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Zarar Edenler</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-rose-400">{lossCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <AlertTriangle size={18} className="text-rose-400" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Negatif kara düşen paketleri tek seferde düzeltin.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Riskli Toplam</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-amber-400">{riskCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <Gauge size={18} className="text-amber-400" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Zarar ve düşük marjlı paketler aynı havuzda yönetilir.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Seçili Paket</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-sky-400">{selectedRows.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <CheckCircle2 size={18} className="text-sky-400" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Seçili satırlara mevcut markup kuralı uygulanacak.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tahmini Toplam Artış</p>
              <p className="mt-2 truncate text-2xl font-black tracking-tight text-emerald-400">{formatPrice(projectedLift)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
              <TrendingUp size={18} className="text-emerald-400" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Seçili paketlerde fiyat katmanlarına eklenecek toplam fark.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Perakende Markup %</span>
              <Input type="number" min="0" step="1" value={retailMarkup} onChange={(event) => setRetailMarkup(event.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bayi Markup %</span>
              <Input type="number" min="0" step="1" value={resellerMarkup} onChange={(event) => setResellerMarkup(event.target.value)} />
            </label>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "loss", label: "Sadece Zarar", count: lossCount },
                { key: "risk", label: "Zarar + Düşük Marj", count: riskCount },
                { key: "all", label: "Tüm Maliyetli Paketler", count: packages.length - unknownCount },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScope(item.key as PricingScope)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    scope === item.key
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{item.label}</span>
                  <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] tabular-nums">{item.count}</span>
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyIncrease}
                onChange={(event) => setOnlyIncrease(event.target.checked)}
                className="size-4 rounded border-white/15 bg-white/5"
              />
              Sadece fiyat artır, mevcut daha yüksek değerleri koru
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <Button type="button" variant="outline" onClick={() => setDeselectedIds([])} disabled={isPending || candidateIds.length === 0}>
            Görünenleri Seç
          </Button>
          <Button type="button" variant="outline" onClick={() => setDeselectedIds(candidateIds)} disabled={isPending || selectedIds.length === 0}>
            Seçimi Temizle
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => applyTo(rows.filter((row) => row.pkg.profitability.isLossMaking && row.recommendation?.needsUpdate).map((row) => row.pkg.id), "Zarar eden paketler")}
            disabled={isPending}
          >
            <WandSparkles size={14} />
            Tüm Zarar Edenleri Düzelt
          </Button>
          <Button type="button" onClick={() => applyTo(selectedIds, "Seçili paketler")} disabled={isPending || selectedIds.length === 0}>
            <Sparkles size={14} />
            {isPending ? "Uygulanıyor..." : "Seçili Paketlere Uygula"}
          </Button>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold">Aktif fiyatlama profili</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Varsayılan kurala göre baz fiyat ve perakende fiyatı maliyet x %{retailMarkupValue + 100}, bayi fiyatı ise maliyet x %{resellerMarkupValue + 100} seviyesine taşınır.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">Varsayılan perakende: %{markupSettings.retailMarkupPercent}</Badge>
            <Badge variant="outline">Varsayılan bayi: %{markupSettings.resellerMarkupPercent}</Badge>
            <Badge variant="outline">Maliyeti eksik paket: {unknownCount}</Badge>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-card/60 p-4 shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <th className="pb-3 pr-3">
                <input
                  type="checkbox"
                  checked={candidateIds.length > 0 && candidateIds.every((id) => selectedSet.has(id))}
                  onChange={(event) => setDeselectedIds(event.target.checked ? [] : candidateIds)}
                  className="size-4 rounded border-white/15 bg-white/5"
                />
              </th>
              <th className="pb-3 pr-4">Paket</th>
              <th className="pb-3 pr-4 text-right">Maliyet</th>
              <th className="pb-3 pr-4 text-right">Mevcut</th>
              <th className="pb-3 pr-4 text-right">Hedef</th>
              <th className="pb-3 pr-4 text-right">Toplam Artış</th>
              <th className="pb-3 text-center">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-sm text-muted-foreground">
                  Bu kapsamda fiyat optimizasyonu yapılacak paket bulunamadı.
                </td>
              </tr>
            ) : (
              rows.map(({ pkg, recommendation }) => {
                if (!recommendation) {
                  return null;
                }

                const checked = selectedSet.has(pkg.id);
                const statusClass = pkg.profitability.isLossMaking
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : pkg.profitability.isLowMargin
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

                return (
                  <tr key={pkg.id} className={cn("transition-colors hover:bg-white/3", checked && "bg-primary/5") }>
                    <td className="py-3 pr-3 align-top">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggleSelection(pkg.id, event.target.checked)}
                        disabled={!recommendation.needsUpdate}
                        className="mt-1 size-4 rounded border-white/15 bg-white/5"
                      />
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <div>
                        <p className="font-medium leading-tight">{pkg.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{pkg.service.name} · {pkg.quantity.toLocaleString("tr")} adet</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right align-top font-semibold">
                      {formatPrice(pkg.profitability.baseCost)}
                    </td>
                    <td className="py-3 pr-4 align-top text-right text-xs text-muted-foreground">
                      <div>Baz: {formatPrice(pkg.price)}</div>
                      <div className="mt-1">Perakende: {formatPrice(pkg.retailPrice)}</div>
                      <div className="mt-1">Bayi: {formatPrice(pkg.resellerPrice)}</div>
                    </td>
                    <td className="py-3 pr-4 align-top text-right text-xs">
                      <div className="font-semibold text-foreground">Baz: {formatPrice(recommendation.price)}</div>
                      <div className="mt-1">Perakende: {formatPrice(recommendation.retailPrice)}</div>
                      <div className="mt-1">Bayi: {formatPrice(recommendation.resellerPrice)}</div>
                    </td>
                    <td className="py-3 pr-4 text-right align-top">
                      {recommendation.needsUpdate ? (
                        <>
                          <div className="font-semibold text-emerald-400">{formatPrice(recommendation.totalLift)}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Baz +{recommendation.priceDelta?.toFixed(2) ?? "0.00"}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Yeni artış gerekmiyor</span>
                      )}
                    </td>
                    <td className="py-3 text-center align-top">
                      <Badge className={statusClass}>
                        {pkg.profitability.isLossMaking ? "Zarar" : pkg.profitability.isLowMargin ? "Düşük Marj" : "Sağlıklı"}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
