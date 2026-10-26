"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Percent, AlertTriangle, CheckCircle2 } from "lucide-react";

type Props = {
  categories: { id: string; name: string; categoryIds?: string[]; count?: number }[];
  providers: { id: string; name: string }[];
};

type State = "idle" | "preview" | "confirming" | "loading" | "done" | "error";

export function BulkPriceUpdateDialog({ categories, providers }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [percent, setPercent] = useState("");
  const [target, setTarget] = useState<"retail" | "reseller" | "both">("both");
  const [scope, setScope] = useState<"all" | "category" | "provider">("all");
  const [categoryId, setCategoryId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [previewCount, setPreviewCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const pct = Number(percent);
  const isValidPercent = Number.isFinite(pct) && pct !== 0 && pct >= -99 && pct <= 10000;

  function reset() {
    setState("idle");
    setPercent("");
    setTarget("both");
    setScope("all");
    setCategoryId("");
    setProviderId("");
    setPreviewCount(0);
    setUpdatedCount(0);
    setErrorMsg("");
  }

  async function handlePreview() {
    if (!isValidPercent) return;
    if (scope === "category" && !categoryId) return;
    if (scope === "provider" && !providerId) return;
    setState("loading");
    try {
      const res = await fetch("/api/admin/services/bulk-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percent: pct,
          target,
          scope,
          categoryId: scope === "category" ? categoryId : undefined,
          categoryIds: scope === "category" ? selectedCategoryIds : undefined,
          providerId: scope === "provider" ? providerId : undefined,
          preview: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Hata");
      setPreviewCount(data.count);
      setState("confirming");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Bilinmeyen hata");
      setState("error");
    }
  }

  async function handleApply() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/services/bulk-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percent: pct,
          target,
          scope,
          categoryId: scope === "category" ? categoryId : undefined,
          categoryIds: scope === "category" ? selectedCategoryIds : undefined,
          providerId: scope === "provider" ? providerId : undefined,
          preview: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Hata");
      setUpdatedCount(data.updated);
      setState("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Bilinmeyen hata");
      setState("error");
    }
  }

  const targetLabel =
    target === "retail" ? "Perakende fiyat" : target === "reseller" ? "Bayi fiyatı" : "Perakende + Bayi";
  const scopeLabel =
    scope === "all"
      ? "Tüm servisler"
      : scope === "category"
        ? (categories.find((c) => c.id === categoryId)?.name ?? "Seçili kategori")
        : (providers.find((p) => p.id === providerId)?.name ?? "Seçili sağlayıcı");
  const selectedCategoryIds = categories.find((c) => c.id === categoryId)?.categoryIds ?? (categoryId ? [categoryId] : []);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="gap-2"><Percent size={15} />Toplu Fiyat Güncelle</Button>} />

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Toplu Fiyat Güncelleme</DialogTitle>
          <DialogDescription>
            Seçilen servislerin perakende ve/veya bayi fiyatlarına yüzdesel artış veya indirim uygulayın.
          </DialogDescription>
        </DialogHeader>

        {(state === "idle" || state === "loading") && (
          <div className="space-y-4 py-2">
            {/* Yüzde */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Yüzde Değişim</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    placeholder="ör: 20 veya -10"
                    inputMode="decimal"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
                {pct > 0 && isValidPercent && (
                  <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                    <TrendingUp size={12} />
                    +{pct}% artış
                  </Badge>
                )}
                {pct < 0 && isValidPercent && (
                  <Badge className="gap-1 bg-red-500/15 text-red-400 border-red-500/20">
                    <TrendingDown size={12} />
                    {pct}% indirim
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Pozitif = artış (ör: 20 → %20 zam), Negatif = indirim (ör: -10 → %10 indirim)
              </p>
            </div>

            {/* Hangi fiyat */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Hangi Fiyat</label>
              <div className="flex gap-2">
                {(["both", "retail", "reseller"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTarget(t)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                      target === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-white/10 hover:border-white/20 text-slate-400"
                    }`}
                  >
                    {t === "both" ? "İkisi de" : t === "retail" ? "Perakende" : "Bayi"}
                  </button>
                ))}
              </div>
            </div>

            {/* Kapsam */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kapsam</label>
              <div className="flex gap-2">
                {(["all", "category", "provider"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                      scope === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-white/10 hover:border-white/20 text-slate-400"
                    }`}
                  >
                    {s === "all" ? "Tümü" : s === "category" ? "Kategori" : "Sağlayıcı"}
                  </button>
                ))}
              </div>
            </div>

            {scope === "category" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Kategori seçin...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.count != null ? ` (${c.count})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === "provider" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sağlayıcı</label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sağlayıcı seçin...</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {state === "confirming" && (
          <div className="py-4 space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">Onay Gerekiyor</p>
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-white">{previewCount}</span> servisin{" "}
                  <span className="font-semibold text-white">{targetLabel}</span> fiyatı,{" "}
                  <span className="font-semibold text-white">
                    {pct > 0 ? `%${pct} artırılacak` : `%${Math.abs(pct)} indirilecek`}
                  </span>
                  .
                </p>
                <p className="text-xs text-slate-500">Kapsam: {scopeLabel}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Bu işlem geri alınamaz. Emin misiniz?
            </p>
          </div>
        )}

        {state === "done" && (
          <div className="py-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">Güncelleme Tamamlandı</p>
                <p className="text-xs text-slate-400 mt-1">
                  <span className="font-semibold text-white">{updatedCount}</span> servisin fiyatı güncellendi.
                </p>
              </div>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="py-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex gap-3">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Hata Oluştu</p>
                <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {state === "idle" && (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button
                onClick={handlePreview}
                disabled={
                  !isValidPercent ||
                  (scope === "category" && !categoryId) ||
                  (scope === "provider" && !providerId)
                }
              >
                Önizle
              </Button>
            </>
          )}
          {state === "loading" && (
            <Button disabled>İşleniyor...</Button>
          )}
          {state === "confirming" && (
            <>
              <Button variant="ghost" onClick={() => setState("idle")}>
                Geri
              </Button>
              <Button onClick={handleApply} className="bg-amber-600 hover:bg-amber-700">
                Uygula
              </Button>
            </>
          )}
          {(state === "done" || state === "error") && (
            <Button onClick={() => { reset(); setOpen(false); window.location.reload(); }}>
              Kapat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
