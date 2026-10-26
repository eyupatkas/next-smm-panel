"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, DatabaseZap, Loader2, Plus, Search } from "lucide-react";
import { createProviderWithImportAdmin } from "@/lib/actions/admin-provider-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PreviewCategory = { name: string; count: number };
type PreviewService = {
  externalId: string;
  name: string;
  category: string;
  type: string;
  rate: number;
  min: number;
  max: number;
};
type PreviewData = {
  total: number;
  categories: PreviewCategory[];
  services: PreviewService[];
};

type ImportMode = "none" | "all" | "categories" | "services";

export function AddProviderDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [status, setStatus] = useState(true);
  const [retailMarkupPercent, setRetailMarkupPercent] = useState("200");
  const [resellerMarkupPercent, setResellerMarkupPercent] = useState("100");
  const [categoryNamePrefix, setCategoryNamePrefix] = useState("");
  const [serviceNamePrefix, setServiceNamePrefix] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("all");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [serviceQuery, setServiceQuery] = useState("");

  const filteredServices = useMemo(() => {
    const query = serviceQuery.trim().toLocaleLowerCase("tr");
    const rows = preview?.services ?? [];
    if (!query) return rows;
    return rows.filter((service) =>
      [service.externalId, service.name, service.category, service.type]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(query),
    );
  }, [preview?.services, serviceQuery]);

  const importCount = useMemo(() => {
    if (!preview || importMode === "none") return 0;
    if (importMode === "all") return preview.total;
    if (importMode === "categories") {
      return preview.categories
        .filter((category) => selectedCategories.has(category.name))
        .reduce((sum, category) => sum + category.count, 0);
    }
    return selectedServices.size;
  }, [importMode, preview, selectedCategories, selectedServices]);

  function reset() {
    setStep(1);
    setName("");
    setApiUrl("");
    setApiKey("");
    setBaseCurrency("USD");
    setStatus(true);
    setRetailMarkupPercent("200");
    setResellerMarkupPercent("100");
    setCategoryNamePrefix("");
    setServiceNamePrefix("");
    setPreview(null);
    setImportMode("all");
    setSelectedCategories(new Set());
    setSelectedServices(new Set());
    setServiceQuery("");
  }

  async function loadPreview() {
    if (!name.trim() || !apiUrl.trim() || !apiKey.trim()) {
      toast.error("Saglayici adi, API URL ve API key zorunludur.");
      return;
    }

    setPreviewPending(true);
    try {
      const response = await fetch("/api/admin/provider-services/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error || "Saglayici katalogu okunamadi.");
        return;
      }
      setPreview(data);
      setSelectedCategories(new Set(data.categories.map((category: PreviewCategory) => category.name)));
      setSelectedServices(new Set());
      setImportMode("all");
      setStep(2);
      toast.success(`${data.total.toLocaleString("tr-TR")} servis bulundu.`);
    } catch {
      toast.error("Saglayici API baglantisi test edilemedi.");
    } finally {
      setPreviewPending(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await createProviderWithImportAdmin(formData);
      if (!("success" in result)) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success || "Saglayici basariyla eklendi.");
      setOpen(false);
      reset();
    } catch {
      toast.error("Saglayici eklenirken hata olustu.");
    } finally {
      setPending(false);
    }
  }

  function toggleCategory(name: string) {
    setSelectedCategories((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleService(id: string) {
    setSelectedServices((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) reset();
    }}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus size={16} /> Saglayici Ekle
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Yeni Saglayici Ekle</DialogTitle>
          <DialogDescription>
            API bilgilerini girin, katalogu tarayin ve hangi servislerin ice aktarilacagini secin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {["API Baglantisi", "Ice Aktarma", "Onay"].map((label, index) => {
            const active = step === index + 1;
            const done = step > index + 1;
            return (
              <div key={label} className={`rounded-lg border px-3 py-2 ${active ? "border-primary/50 bg-primary/10" : done ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.02]"}`}>
                <span className="font-semibold">{index + 1}. {label}</span>
              </div>
            );
          })}
        </div>

        <form action={handleSubmit} className="grid gap-5">
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="apiUrl" value={apiUrl} />
          <input type="hidden" name="apiKey" value={apiKey} />
          <input type="hidden" name="baseCurrency" value={baseCurrency} />
          <input type="hidden" name="retailMarkupPercent" value={retailMarkupPercent} />
          <input type="hidden" name="resellerMarkupPercent" value={resellerMarkupPercent} />
          <input type="hidden" name="categoryNamePrefix" value={categoryNamePrefix} />
          <input type="hidden" name="serviceNamePrefix" value={serviceNamePrefix} />
          <input type="hidden" name="importMode" value={importMode} />
          <input type="hidden" name="selectedCategories" value={Array.from(selectedCategories).join("\n")} />
          <input type="hidden" name="selectedServiceIds" value={Array.from(selectedServices).join("\n")} />
          {status && <input type="hidden" name="status" value="on" />}

          {step === 1 && (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="provName" className="text-sm font-medium">Ad</label>
                  <Input id="provName" value={name} onChange={(event) => setName(event.target.value)} placeholder="Bayievi" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="provApiUrl" className="text-sm font-medium">API URL</label>
                  <Input id="provApiUrl" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="https://bayievi.com/api/v2" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="provApiKey" className="text-sm font-medium">API Key</label>
                  <Input id="provApiKey" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="API anahtari" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="baseCurrency" className="text-sm font-medium">Fiyat Para Birimi</label>
                  <select
                    id="baseCurrency"
                    value={baseCurrency}
                    onChange={(event) => setBaseCurrency(event.target.value === "TRY" ? "TRY" : "USD")}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="TRY">TRY</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Saglayici API rate degeri hangi para birimindeyse onu secin.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="retailMarkup" className="text-sm font-medium">Perakende Kar Orani %</label>
                  <Input id="retailMarkup" type="number" min="0" value={retailMarkupPercent} onChange={(event) => setRetailMarkupPercent(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="resellerMarkup" className="text-sm font-medium">Bayi Kar Orani %</label>
                  <Input id="resellerMarkup" type="number" min="0" value={resellerMarkupPercent} onChange={(event) => setResellerMarkupPercent(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="categoryPrefix" className="text-sm font-medium">Kategori On Eki</label>
                  <Input id="categoryPrefix" value={categoryNamePrefix} onChange={(event) => setCategoryNamePrefix(event.target.value)} placeholder="Orn: Bayievi" />
                  <p className="text-xs text-muted-foreground">Bos birakilirsa kategori isimleri oldugu gibi kalir.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="servicePrefix" className="text-sm font-medium">Servis On Eki</label>
                  <Input id="servicePrefix" value={serviceNamePrefix} onChange={(event) => setServiceNamePrefix(event.target.value)} placeholder="Orn: Bayievi" />
                  <p className="text-xs text-muted-foreground">Import ve sonraki sync sirasinda servis adlarinin basina eklenir.</p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={status} onChange={(event) => setStatus(event.target.checked)} />
                <span>Aktif olarak ekle</span>
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Vazgec
                </Button>
                <Button type="button" onClick={loadPreview} disabled={previewPending} className="gap-2">
                  {previewPending ? <Loader2 className="animate-spin" size={16} /> : <DatabaseZap size={16} />}
                  Baglan ve Katalogu Tara
                </Button>
                <Button type="button" variant="secondary" onClick={() => {
                  if (!name.trim() || !apiUrl.trim() || !apiKey.trim()) {
                    toast.error("Saglayici adi, API URL ve API key zorunludur.");
                    return;
                  }
                  setImportMode("none");
                  setStep(3);
                }}>
                  Sadece Kaydet
                </Button>
              </div>
            </div>
          )}

          {step === 2 && preview && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { key: "all", label: "Tum servisler", desc: `${preview.total.toLocaleString("tr-TR")} servis` },
                  { key: "categories", label: "Kategori sec", desc: "Secili kategoriler" },
                  { key: "services", label: "Servis sec", desc: "Tek tek servisler" },
                  { key: "none", label: "Simdilik alma", desc: "Sadece saglayici" },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.key}
                    onClick={() => setImportMode(option.key as ImportMode)}
                    className={`rounded-xl border p-4 text-left transition-all ${importMode === option.key ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {importMode === option.key && <CheckCircle2 size={15} className="text-primary" />}
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{option.desc}</span>
                  </button>
                ))}
              </div>

              {importMode === "categories" && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Kategoriler</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCategories(new Set(preview.categories.map((category) => category.name)))}>Tumunu Sec</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCategories(new Set())}>Temizle</Button>
                    </div>
                  </div>
                  <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {preview.categories.map((category) => (
                      <label key={category.name} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{category.name}</span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          {category.count.toLocaleString("tr-TR")}
                          <input type="checkbox" checked={selectedCategories.has(category.name)} onChange={() => toggleCategory(category.name)} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {importMode === "services" && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                      <Input value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} placeholder="Servis veya kategori ara" className="pl-9" />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedServices(new Set(filteredServices.map((service) => service.externalId)))}>Gorunenleri Sec</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedServices(new Set())}>Temizle</Button>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {filteredServices.map((service) => (
                      <label key={service.externalId} className="grid gap-1 rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
                        <input type="checkbox" checked={selectedServices.has(service.externalId)} onChange={() => toggleService(service.externalId)} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{service.externalId} - {service.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{service.category} · {service.type || "Default"}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{service.min.toLocaleString("tr-TR")} / {service.max.toLocaleString("tr-TR")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
                Onay sonrasi {importMode === "none" ? "servis cekilmeyecek" : `${importCount.toLocaleString("tr-TR")} servis ice aktarilacak`}.
              </div>

              <div className="flex justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft size={16} /> Geri
                </Button>
                <Button type="button" onClick={() => setStep(3)} disabled={importMode !== "none" && importCount === 0} className="gap-2">
                  Onaya Gec <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm font-semibold">Ozet</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <p><span className="text-foreground">Saglayici:</span> {name}</p>
                  <p><span className="text-foreground">Durum:</span> {status ? "Aktif" : "Pasif"}</p>
                  <p><span className="text-foreground">Para birimi:</span> {baseCurrency}</p>
                  <p><span className="text-foreground">Perakende kar:</span> %{retailMarkupPercent}</p>
                  <p><span className="text-foreground">Bayi kar:</span> %{resellerMarkupPercent}</p>
                  <p><span className="text-foreground">Kategori on eki:</span> {categoryNamePrefix || "Yok"}</p>
                  <p><span className="text-foreground">Servis on eki:</span> {serviceNamePrefix || "Yok"}</p>
                  <p className="sm:col-span-2"><span className="text-foreground">Ice aktarma:</span> {importMode === "none" ? "Servis cekilmeyecek" : `${importCount.toLocaleString("tr-TR")} servis`}</p>
                </div>
              </div>
              <div className="flex justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(preview ? 2 : 1)} className="gap-2" disabled={pending}>
                  <ArrowLeft size={16} /> Geri
                </Button>
                <Button type="submit" disabled={pending || (importMode !== "none" && importCount === 0)}>
                  {pending ? <Loader2 className="animate-spin" size={16} /> : null}
                  {pending ? "Kaydediliyor..." : "Saglayiciyi Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
