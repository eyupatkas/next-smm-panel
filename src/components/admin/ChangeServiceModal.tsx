"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { changeOrderServiceAdmin } from "@/lib/actions/admin-actions";
import {
  ArrowLeft, ChevronRight, Layers, Search, Server, Shuffle,
  CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import { unitPriceSuffix, type ClientPricingMode } from "@/lib/client-pricing";

interface Provider { id: string; name: string; balance: number; baseCurrency: string; }
interface Category { id: string; name: string; slug: string; }
interface ServiceItem {
  id: string; name: string; externalId: string | null;
  price: number; min: number; max: number; pricingMode?: ClientPricingMode;
  category: { name: string };
  provider: { name: string } | null;
}

type Step = "provider" | "category" | "service";

interface Props {
  orderId: string;
  currentServiceName: string;
  currentQuantity: number;
  onChanged?: () => void;
}

export default function ChangeServiceModal({ orderId, currentServiceName, currentQuantity, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("provider");

  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  const [searchQ, setSearchQ] = useState("");
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingSvcs, setLoadingSvcs] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load providers on open
  useEffect(() => {
    if (!open) return;
    setStep("provider");
    setSelectedProvider(null);
    setSelectedCategory(null);
    setSelectedService(null);
    setSearchQ("");
    setResult(null);
    fetch("/api/admin/services-search?type=providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => {});
  }, [open]);

  // Load categories when provider selected
  const selectProvider = useCallback(async (prov: Provider) => {
    setSelectedProvider(prov);
    setSelectedCategory(null);
    setSelectedService(null);
    setStep("category");
    setLoadingCats(true);
    try {
      const r = await fetch(`/api/admin/services-search?type=categories&providerId=${prov.id}`);
      const data = await r.json();
      setCategories(data);
    } finally {
      setLoadingCats(false);
    }
  }, []);

  // Load services when category selected or search changes
  const loadServices = useCallback(async (prov: Provider, cat: Category | null, q: string) => {
    setLoadingSvcs(true);
    try {
      const params = new URLSearchParams({ type: "services", providerId: prov.id });
      if (cat) params.set("categoryId", cat.id);
      if (q) params.set("q", q);
      const r = await fetch(`/api/admin/services-search?${params}`);
      const data = await r.json();
      setServices(data);
    } finally {
      setLoadingSvcs(false);
    }
  }, []);

  const selectCategory = useCallback((cat: Category) => {
    setSelectedCategory(cat);
    setSelectedService(null);
    setSearchQ("");
    setStep("service");
    if (selectedProvider) loadServices(selectedProvider, cat, "");
  }, [selectedProvider, loadServices]);

  // Debounced search
  useEffect(() => {
    if (step !== "service" || !selectedProvider) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadServices(selectedProvider, selectedCategory, searchQ);
    }, 280);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQ, step, selectedProvider, selectedCategory, loadServices]);

  const handleConfirm = () => {
    if (!selectedService) return;
    setResult(null);
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("serviceId", selectedService.id);
    startTransition(async () => {
      const res = await changeOrderServiceAdmin(fd);
      if (res?.error) {
        setResult({ error: res.error });
      } else {
        setResult({ ok: true });
        onChanged?.();
        setTimeout(() => setOpen(false), 1200);
      }
    });
  };

  const priceLabel = (svc: ServiceItem) =>
    svc.price > 0 ? `₺${svc.price.toFixed(3)} ${unitPriceSuffix(svc.pricingMode)}` : "—";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-[11px] px-2 gap-1 border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          >
            <Shuffle size={11} />Servisi Değiştir
          </Button>
        }
      />

      <DialogContent
        showCloseButton
        className="max-w-lg w-full bg-[#0f1117] border-white/10 p-0 overflow-hidden"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            {step !== "provider" && (
              <button
                onClick={() => {
                  if (step === "service") { setStep("category"); setSelectedService(null); setSearchQ(""); }
                  else if (step === "category") { setStep("provider"); setSelectedProvider(null); }
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div>
              <DialogTitle className="text-sm font-semibold">Servis Değiştir</DialogTitle>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                Mevcut: <span className="text-slate-400">{currentServiceName}</span>
              </p>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1 mt-3">
            {(["provider", "category", "service"] as Step[]).map((s, i) => {
              const labels = ["Sağlayıcı", "Kategori", "Servis"];
              const active = step === s;
              const done = (step === "category" && i === 0) || (step === "service" && i <= 1);
              return (
                <div key={s} className="flex items-center gap-1">
                  <div className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all",
                    active ? "bg-primary/20 text-primary" :
                    done ? "text-emerald-400" : "text-slate-600"
                  )}>
                    {done ? <CheckCircle2 size={10} /> : <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[8px]">{i + 1}</span>}
                    {labels[i]}
                  </div>
                  {i < 2 && <ChevronRight size={10} className="text-slate-700 shrink-0" />}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <div className="px-5 py-4 min-h-[220px] max-h-[400px] overflow-y-auto">

          {/* Step 1: Providers */}
          {step === "provider" && (
            <div className="space-y-2">
              {providers.length === 0 && (
                <div className="flex items-center justify-center h-20 text-slate-600 text-sm">
                  <Loader2 size={16} className="animate-spin mr-2" />Yükleniyor...
                </div>
              )}
              {providers.map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => selectProvider(prov)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 px-4 py-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Server size={15} className="text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-200 block">{prov.name}</span>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        {prov.balance > 0
                          ? `Bakiye: ${prov.balance.toFixed(2)} ${prov.baseCurrency}`
                          : "Bakiye: —"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Categories */}
          {step === "category" && (
            <div className="space-y-1.5">
              {loadingCats && (
                <div className="flex items-center justify-center h-20 text-slate-600 text-sm">
                  <Loader2 size={16} className="animate-spin mr-2" />Kategoriler yükleniyor...
                </div>
              )}
              {!loadingCats && categories.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-8">Kategori bulunamadı.</p>
              )}
              {!loadingCats && categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 px-4 py-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <Layers size={12} className="text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-200">{cat.name}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Services */}
          {step === "service" && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <Input
                  placeholder="Servis adı veya ID ile ara..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="pl-8 h-9 bg-background/50 text-sm"
                  autoFocus
                />
              </div>

              {loadingSvcs && (
                <div className="flex items-center justify-center h-20 text-slate-600 text-sm">
                  <Loader2 size={16} className="animate-spin mr-2" />Servisler yükleniyor...
                </div>
              )}

              {!loadingSvcs && services.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-6">
                  {searchQ ? `"${searchQ}" için sonuç bulunamadı.` : "Servis bulunamadı."}
                </p>
              )}

              <div className="space-y-1">
                {!loadingSvcs && services.map((svc) => {
                  const isSelected = selectedService?.id === svc.id;
                  const compatible = svc.min <= currentQuantity && svc.max >= currentQuantity;
                  return (
                    <button
                      key={svc.id}
                      onClick={() => setSelectedService(isSelected ? null : svc)}
                      className={cn(
                        "w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                        isSelected
                          ? "border-primary/50 bg-primary/10"
                          : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all",
                        isSelected ? "border-primary bg-primary" : "border-slate-600"
                      )}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium leading-snug", isSelected ? "text-primary" : "text-slate-200")}>
                          {svc.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {svc.externalId && (
                            <span className="text-[10px] text-slate-600 font-mono">#{svc.externalId}</span>
                          )}
                          <span className="text-[10px] text-slate-500">{svc.category.name}</span>
                          <span className="text-[10px] font-medium text-emerald-400/80">{priceLabel(svc)}</span>
                          {!compatible && (
                            <span className="text-[10px] text-amber-400/80 flex items-center gap-0.5">
                              <AlertCircle size={9} />min {svc.min.toLocaleString("tr-TR")}–max {svc.max.toLocaleString("tr-TR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600 min-w-0">
            {selectedService && (
              <span className="text-slate-400 line-clamp-1">
                Seçili: <span className="text-primary font-medium">{selectedService.name}</span>
              </span>
            )}
            {result?.error && (
              <span className="text-red-400 flex items-center gap-1"><AlertCircle size={11} />{result.error}</span>
            )}
            {result?.ok && (
              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} />Servis değiştirildi!</span>
            )}
          </div>
          <Button
            size="sm"
            className="shrink-0 h-8 px-4 text-xs"
            disabled={!selectedService || isPending || result?.ok === true}
            onClick={handleConfirm}
          >
            {isPending ? <><Loader2 size={12} className="animate-spin mr-1" />Kaydediliyor...</> : "Onayla"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
