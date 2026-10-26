"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, DatabaseZap, Loader2, Percent, RefreshCcw, Search } from "lucide-react";
import { importProviderServicesAdmin } from "@/lib/actions/admin-provider-actions";
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

type ProviderOption = {
  id: string;
  name: string;
  status: boolean;
  retailMarkupPercent: number;
  resellerMarkupPercent: number;
};

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

type ImportMode = "all" | "categories" | "services";

export function ProviderImportDialog({ providers }: { providers: ProviderOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("all");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [serviceQuery, setServiceQuery] = useState("");

  const selectedProvider = providers.find((provider) => provider.id === selectedId);

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
    if (!preview) return 0;
    if (importMode === "all") return preview.total;
    if (importMode === "categories") {
      return preview.categories
        .filter((category) => selectedCategories.has(category.name))
        .reduce((sum, category) => sum + category.count, 0);
    }
    return selectedServices.size;
  }, [importMode, preview, selectedCategories, selectedServices]);

  function resetSelection() {
    setPreview(null);
    setImportMode("all");
    setSelectedCategories(new Set());
    setSelectedServices(new Set());
    setServiceQuery("");
  }

  async function loadPreview() {
    if (!selectedId) {
      toast.error("Once saglayici secin.");
      return;
    }

    setPreviewPending(true);
    try {
      const response = await fetch("/api/admin/provider-services/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: selectedId }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error || "Servis onizlemesi alinamadi.");
        return;
      }
      setPreview(data);
      setSelectedCategories(new Set(data.categories.map((category: PreviewCategory) => category.name)));
      setSelectedServices(new Set());
      setImportMode("all");
      toast.success(`${data.total.toLocaleString("tr-TR")} servis bulundu.`);
    } catch {
      toast.error("Saglayici API onizlemesi alinamadi.");
    } finally {
      setPreviewPending(false);
    }
  }

  async function submitAction(formData: FormData) {
    setPending(true);
    try {
      const result = await importProviderServicesAdmin(formData);

      if (!("success" in result)) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success || "Servisler basariyla cekildi.");
      setOpen(false);
      resetSelection();
    } catch {
      toast.error("Saglayicidan servisler cekilirken hata olustu.");
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
      if (!nextOpen) resetSelection();
    }}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <RefreshCcw size={16} /> Saglayicidan Cek / Yenile
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Servisleri Secerek Saglayicidan Cek</DialogTitle>
          <DialogDescription>
            Tum katalogu cekebilir, sadece belirli kategorileri alabilir veya tek tek servis secebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <form action={submitAction} className="grid gap-5">
          <input type="hidden" name="importMode" value={importMode} />
          <input type="hidden" name="selectedCategories" value={Array.from(selectedCategories).join("\n")} />
          <input type="hidden" name="selectedServiceIds" value={Array.from(selectedServices).join("\n")} />

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-2">
              <label htmlFor="providerId" className="text-sm font-medium">Saglayici</label>
              <select
                id="providerId"
                name="providerId"
                required
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  resetSelection();
                }}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>Bir saglayici secin</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} {provider.status ? "· Aktif" : "· Pasif"}
                  </option>
                ))}
              </select>
            </div>

            <Button type="button" onClick={loadPreview} disabled={!selectedId || previewPending} className="h-11 gap-2">
              {previewPending ? <Loader2 className="animate-spin" size={16} /> : <DatabaseZap size={16} />}
              API Katalogunu Tara
            </Button>
          </div>

          {selectedProvider && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                <Percent size={12} /> {selectedProvider.name} fiyatlandirma
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Perakende Kar</p>
                  <p className="font-bold text-emerald-400">+%{selectedProvider.retailMarkupPercent}</p>
                  <p className="text-xs text-muted-foreground">Maliyet x {(1 + selectedProvider.retailMarkupPercent / 100).toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Bayi Kar</p>
                  <p className="font-bold text-amber-400">+%{selectedProvider.resellerMarkupPercent}</p>
                  <p className="text-xs text-muted-foreground">Maliyet x {(1 + selectedProvider.resellerMarkupPercent / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {preview && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { key: "all", label: "Tum servisler", desc: `${preview.total.toLocaleString("tr-TR")} servis` },
                  { key: "categories", label: "Kategori sec", desc: "Secili kategorilerdeki tum servisler" },
                  { key: "services", label: "Servis sec", desc: "Sadece isaretlenen servisler" },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.key}
                    onClick={() => setImportMode(option.key as ImportMode)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      importMode === option.key
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {importMode === option.key && <CheckCircle2 size={15} className="text-primary" />}
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs">{option.desc}</span>
                  </button>
                ))}
              </div>

              {importMode === "categories" && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Kategoriler</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCategories(new Set(preview.categories.map((category) => category.name)))}>
                        Tumunu Sec
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCategories(new Set())}>
                        Temizle
                      </Button>
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
                      <Input
                        value={serviceQuery}
                        onChange={(event) => setServiceQuery(event.target.value)}
                        placeholder="Servis veya kategori ara"
                        className="pl-9"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedServices(new Set(filteredServices.map((service) => service.externalId)))}>
                      Gorunenleri Sec
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedServices(new Set())}>
                      Temizle
                    </Button>
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
                Bu calistirmada yaklasik {importCount.toLocaleString("tr-TR")} servis ice aktarilacak.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="retailRounding" className="text-sm font-medium">Perakende yuvarlama</label>
              <select id="retailRounding" name="retailRounding" defaultValue="NONE" className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="NONE">Yuvarlama yok</option>
                <option value="UP_09">Kusurati .09&apos;a yuvarla</option>
                <option value="UP_29">Kusurati .29&apos;a yuvarla</option>
                <option value="UP_49">Kusurati .49&apos;a yuvarla</option>
                <option value="UP_99">Kusurati .99&apos;a yuvarla</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="resellerRounding" className="text-sm font-medium">Bayi yuvarlama</label>
              <select id="resellerRounding" name="resellerRounding" defaultValue="NONE" className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="NONE">Yuvarlama yok</option>
                <option value="UP_09">Kusurati .09&apos;a yuvarla</option>
                <option value="UP_29">Kusurati .29&apos;a yuvarla</option>
                <option value="UP_49">Kusurati .49&apos;a yuvarla</option>
                <option value="UP_99">Kusurati .99&apos;a yuvarla</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Vazgec
            </Button>
            <Button type="submit" disabled={pending || !selectedId || (preview ? importCount === 0 : false)}>
              {pending ? <Loader2 className="animate-spin" size={16} /> : null}
              {pending ? "Cekiliyor..." : "Secimi Ice Aktar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
