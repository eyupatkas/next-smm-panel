"use client";

import { useState, useCallback, useMemo, useTransition, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { getPlatformIcon, getPlatformColor } from "@/lib/platform-icons";
import {
  Search,
  Package,
  Loader2,
  CheckCircle2,
  XCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Minus,
  Zap,
  RotateCcw,
  FileText,
  ChevronDown,
  Globe,
  SlidersHorizontal,
  GitMerge,
} from "lucide-react";
import { updateServiceAdmin, toggleServiceStatusAdmin, normalizeServiceCatalogCategoriesAdmin } from "@/lib/actions/admin-actions";
import { BulkPriceUpdateDialog } from "@/components/admin/BulkPriceUpdateDialog";
import { ProviderImportDialog } from "@/components/admin/ProviderImportDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  externalId: string | null;
  price: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  min: number;
  max: number;
  status: boolean;
  canRefill: boolean;
  canCancel: boolean;
  hasDripfeed: boolean;
  avgCompletionMinutes: number | null;
  completedOrderCount: number;
  linkFormat: string | null;
  categoryName: string;
  parentCategoryName: string | null;
  providerId: string | null;
  providerName: string | null;
  providerCode: string | null;
}

export interface ServiceStats {
  total: number;
  active: number;
  passive: number;
  byProvider: {
    id: string;
    name: string;
    code: string;
    activeCount: number;
    totalCount: number;
  }[];
}

export interface PlatformTab {
  key: string;
  name: string;
  count: number;
}

export interface ProviderOption {
  id: string;
  name: string;
  code: string;
  status: boolean;
  retailMarkupPercent: number;
  resellerMarkupPercent: number;
}

export interface CategoryOption {
  id: string;
  name: string;
  platformKey: string;
  categoryIds: string[];
  count: number;
}

export interface CategoryHealth {
  platformCount: number;
  categoryCount: number;
  duplicateCategoryGroups: number;
  providerScopedCategoryCount: number;
}

export interface AdminServicesClientProps {
  services: ServiceRow[];
  stats: ServiceStats;
  categoryHealth: CategoryHealth;
  platforms: PlatformTab[];
  providers: ProviderOption[];
  categories: CategoryOption[];
  pagination: { page: number; totalPages: number; totalCount: number };
  filters: { q: string; platform: string; category: string; provider: string; status: string; sort: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_BADGE: Record<string, string> = {
  S1: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  S2: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  S3: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  S4: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  S5: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  S6: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  S7: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25",
  S8: "bg-lime-500/15 text-lime-400 border-lime-500/25",
};

function fmtFull(n: number | null | undefined): string {
  if (n == null) return "";
  return n.toFixed(6);
}

function formatSpeed(minutes: number): string {
  if (minutes < 60) return `~${Math.round(minutes)} dk`;
  if (minutes < 1440) return `~${Math.round(minutes / 60)} sa`;
  return "24+ saat";
}

// ─── Individual Service Row ───────────────────────────────────────────────────

function ServiceEditRow({
  service,
  selected,
  onSelect,
}: {
  service: ServiceRow;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}) {
  const [price, setPrice] = useState(fmtFull(service.price));
  const [retail, setRetail] = useState(service.retailPrice != null ? fmtFull(service.retailPrice) : "");
  const [reseller, setReseller] = useState(service.resellerPrice != null ? fmtFull(service.resellerPrice) : "");
  const [status, setStatus] = useState(service.status);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Description panel
  const [descOpen, setDescOpen] = useState(false);
  const [desc, setDesc] = useState(service.description ?? "");
  const [descSaving, setDescSaving] = useState(false);
  const [descSavedOk, setDescSavedOk] = useState(false);
  const [linkFormat, setLinkFormat] = useState(service.linkFormat ?? "URL");
  const [linkFormatSaving, setLinkFormatSaving] = useState(false);
  const [linkFormatSavedOk, setLinkFormatSavedOk] = useState(false);

  const dirty =
    price !== fmtFull(service.price) ||
    retail !== (service.retailPrice != null ? fmtFull(service.retailPrice) : "") ||
    reseller !== (service.resellerPrice != null ? fmtFull(service.resellerPrice) : "");

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    setSavedOk(false);
    setSaveErr(false);
    try {
      const fd = new FormData();
      fd.set("id", service.id);
      fd.set("price", price);
      fd.set("retailPrice", retail);
      fd.set("resellerPrice", reseller);
      fd.set("status", status ? "on" : "");
      await updateServiceAdmin(fd);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch {
      setSaveErr(true);
      setTimeout(() => setSaveErr(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDesc() {
    setDescSaving(true);
    try {
      const fd = new FormData();
      fd.set("id", service.id);
      fd.set("price", fmtFull(service.price));
      fd.set("retailPrice", service.retailPrice != null ? fmtFull(service.retailPrice) : "");
      fd.set("resellerPrice", service.resellerPrice != null ? fmtFull(service.resellerPrice) : "");
      fd.set("status", status ? "on" : "");
      fd.set("description", desc);
      await updateServiceAdmin(fd);
      setDescSavedOk(true);
      setTimeout(() => { setDescSavedOk(false); setDescOpen(false); }, 1500);
    } catch {
      // silent
    } finally {
      setDescSaving(false);
    }
  }

  async function handleSaveLinkFormat(newFormat: string) {
    setLinkFormat(newFormat);
    setLinkFormatSaving(true);
    try {
      const fd = new FormData();
      fd.set("id", service.id);
      fd.set("price", fmtFull(service.price));
      fd.set("retailPrice", service.retailPrice != null ? fmtFull(service.retailPrice) : "");
      fd.set("resellerPrice", service.resellerPrice != null ? fmtFull(service.resellerPrice) : "");
      fd.set("status", status ? "on" : "");
      fd.set("linkFormat", newFormat);
      await updateServiceAdmin(fd);
      setLinkFormatSavedOk(true);
      setTimeout(() => setLinkFormatSavedOk(false), 2000);
    } catch {
      // silent
    } finally {
      setLinkFormatSaving(false);
    }
  }

  async function handleToggleStatus() {
    setToggling(true);
    const next = !status;
    setStatus(next);
    try {
      await toggleServiceStatusAdmin(service.id, next);
    } catch {
      setStatus(!next);
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
    <tr
      className={cn(
        "border-b border-white/[0.04] transition-colors hover:bg-white/[0.025]",
        !status && "opacity-55",
      )}
    >
      {/* Checkbox */}
      <td className="py-2.5 pl-4 pr-2 w-8">
        <button
          type="button"
          onClick={() => onSelect(service.id, !selected)}
          className="text-slate-500 hover:text-slate-200 transition-colors"
        >
          {selected ? (
            <CheckSquare size={14} className="text-blue-400" />
          ) : (
            <Square size={14} />
          )}
        </button>
      </td>

      {/* Servis adı + özellikler */}
      <td className="py-2.5 pr-3 max-w-[280px] min-w-[180px]">
        <p
          className="text-sm font-medium text-slate-200 leading-tight line-clamp-2"
          title={service.name}
        >
          {service.name}
        </p>
        {service.externalId && (
          <p className="text-[10px] text-slate-600 font-mono mt-0.5">#{service.externalId}</p>
        )}
        {(service.canRefill || service.canCancel || service.hasDripfeed || service.avgCompletionMinutes != null) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {service.canRefill && (
              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ↩ Doldur
              </span>
            )}
            {service.canCancel && (
              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                ✕ İptal
              </span>
            )}
            {service.hasDripfeed && (
              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ⟲ Dripfeed
              </span>
            )}
            {service.avgCompletionMinutes != null && (
              <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap size={8} />
                {formatSpeed(service.avgCompletionMinutes)}
              </span>
            )}
          </div>
        )}
        {/* Açıklama toggle butonu */}
        <button
          type="button"
          onClick={() => setDescOpen((v) => !v)}
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all",
            descOpen
              ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
              : desc
                ? "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20"
                : "bg-white/[0.04] text-slate-400 border-white/[0.08] hover:bg-white/[0.07] hover:text-slate-200",
          )}
        >
          <FileText size={11} />
          {desc ? "✎ Açıklamayı düzenle" : "+ Açıklama ekle"}
          <ChevronDown size={11} className={cn("transition-transform", descOpen && "rotate-180")} />
        </button>
        {/* Link Format badge */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <select
            value={linkFormat}
            onChange={(e) => handleSaveLinkFormat(e.target.value)}
            disabled={linkFormatSaving}
            className={cn(
              "h-6 rounded border px-1.5 text-[10px] font-semibold cursor-pointer transition-all focus:outline-none",
              linkFormat === "USERNAME"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                : linkFormat === "ANY"
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/25"
                  : "bg-white/[0.04] text-slate-500 border-white/[0.08]",
            )}
            title="Sipariş giriş formatı"
          >
            <option value="URL">🔗 URL (Tam link)</option>
            <option value="USERNAME">👤 USERNAME (Kullanıcı adı)</option>
            <option value="ANY">🔄 ANY (Her ikisi)</option>
          </select>
          {linkFormatSavedOk && <span className="text-[10px] text-emerald-400">✓</span>}
          {linkFormatSaving && <span className="text-[10px] text-slate-500">...</span>}
        </div>
      </td>

      {/* Kategori */}
      <td className="py-2.5 pr-3 min-w-[120px]">
        {service.parentCategoryName && (
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
            {service.parentCategoryName}
          </p>
        )}
        <p className="text-xs text-slate-300">{service.categoryName}</p>
      </td>

      {/* Sağlayıcı */}
      <td className="py-2.5 pr-3 w-14 text-center">
        {service.providerCode ? (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
              PROVIDER_BADGE[service.providerCode] ?? "bg-slate-500/15 text-slate-400 border-slate-500/25",
            )}
          >
            {service.providerCode}
          </span>
        ) : (
          <span className="text-slate-700 text-[10px]">—</span>
        )}
      </td>

      {/* Maliyet */}
      <td className="py-2.5 pr-2 w-28">
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-7 text-xs w-24 font-mono bg-white/[0.03] border-white/[0.07]"
          inputMode="decimal"
          title="Maliyet (1000 başına)"
        />
      </td>

      {/* Perakende */}
      <td className="py-2.5 pr-2 w-28">
        <Input
          value={retail}
          onChange={(e) => setRetail(e.target.value)}
          placeholder="—"
          className="h-7 text-xs w-24 font-mono bg-white/[0.03] border-white/[0.07]"
          inputMode="decimal"
          title="Perakende fiyat"
        />
      </td>

      {/* Bayi */}
      <td className="py-2.5 pr-3 w-28">
        <Input
          value={reseller}
          onChange={(e) => setReseller(e.target.value)}
          placeholder="—"
          className="h-7 text-xs w-24 font-mono bg-white/[0.03] border-white/[0.07]"
          inputMode="decimal"
          title="Bayi fiyat"
        />
      </td>

      {/* Min/Max */}
      <td className="py-2.5 pr-3 text-xs text-slate-500 tabular-nums whitespace-nowrap w-24">
        <p>{service.min.toLocaleString("tr-TR")}</p>
        <p className="text-slate-600 mt-0.5">{service.max.toLocaleString("tr-TR")}</p>
      </td>

      {/* Durum toggle */}
      <td className="py-2.5 pr-3 w-24">
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={toggling}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-all",
            status
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25"
              : "bg-slate-500/15 text-slate-400 border-slate-500/25 hover:bg-slate-500/25",
          )}
        >
          {toggling ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status ? "bg-emerald-400" : "bg-slate-500",
              )}
            />
          )}
          {status ? "Aktif" : "Pasif"}
        </button>
      </td>

      {/* Kaydet */}
      <td className="py-2.5 pr-4 text-right w-28">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all border",
            savedOk
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : saveErr
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : dirty
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30 cursor-pointer"
                  : "text-slate-700 border-white/[0.05] cursor-default",
          )}
        >
          {saving ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              Kaydediliyor
            </>
          ) : savedOk ? (
            <>
              <CheckCircle2 size={11} />
              Kaydedildi
            </>
          ) : saveErr ? (
            <>
              <XCircle size={11} />
              Hata
            </>
          ) : (
            <>
              <Save size={11} />
              {dirty ? "Kaydet" : "—"}
            </>
          )}
        </button>
      </td>
    </tr>
    {/* Açıklama düzenleme satırı */}
    {descOpen && (
      <tr className="border-b border-white/[0.04] bg-sky-500/[0.04]">
        <td colSpan={10} className="px-4 pb-4 pt-2">
          <div className="flex flex-col gap-2 max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
              Servis Açıklaması — {service.name}
            </p>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="Servis açıklamasını buraya girin. Müşteriye sipariş formunda gösterilecektir."
              className="w-full resize-y rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-400/40 focus:outline-none focus:ring-1 focus:ring-sky-400/20"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDesc}
                disabled={descSaving}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all",
                  descSavedOk
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-sky-500/20 text-sky-300 border-sky-500/30 hover:bg-sky-500/30",
                )}
              >
                {descSaving ? <Loader2 size={11} className="animate-spin" /> : descSavedOk ? <CheckCircle2 size={11} /> : <Save size={11} />}
                {descSavedOk ? "Kaydedildi" : "Açıklamayı Kaydet"}
              </button>
              <button
                type="button"
                onClick={() => { setDesc(service.description ?? ""); setDescOpen(false); }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                İptal
              </button>
              {desc && (
                <button
                  type="button"
                  onClick={() => setDesc("")}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Açıklamayı Sil
                </button>
              )}
            </div>
          </div>
        </td>
      </tr>
    )}
    </>
  );
}


// ─── Main Client Component ────────────────────────────────────────────────────

export function AdminServicesClient({
  services,
  stats,
  categoryHealth,
  platforms,
  providers,
  categories,
  pagination,
  filters,
}: AdminServicesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTr] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizeMsg, setNormalizeMsg] = useState<string | null>(null);

  const allPageIds = useMemo(() => services.map((s) => s.id), [services]);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = allPageIds.some((id) => selectedIds.has(id));
  const selectedCount = allPageIds.filter((id) => selectedIds.has(id)).length;

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  const handleBulkStatus = useCallback(
    async (status: boolean) => {
      const ids = allPageIds.filter((id) => selectedIds.has(id));
      if (ids.length === 0) return;
      setBulkLoading(true);
      setBulkMsg(null);
      try {
        const res = await fetch("/api/admin/services/bulk-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, status }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setBulkMsg(`${data.count} servis ${status ? "aktifleştirildi" : "deaktif edildi"}.`);
          setSelectedIds(new Set());
          setTimeout(() => {
            router.refresh();
            setBulkMsg(null);
          }, 1200);
        } else {
          setBulkMsg(data.error ?? "Hata oluştu.");
        }
      } catch {
        setBulkMsg("Bağlantı hatası.");
      } finally {
        setBulkLoading(false);
      }
    },
    [allPageIds, selectedIds, router],
  );

  // URL navigation helper (preserves existing filters, resets page on filter change)
  const navigate = useCallback(
    (params: Partial<{ q: string; platform: string; category: string; provider: string; status: string; sort: string; page: string }>) => {
      const merged = {
        q: filters.q,
        platform: filters.platform,
        category: filters.category,
        provider: filters.provider,
        status: filters.status,
        sort: filters.sort,
        page: String(pagination.page),
        ...params,
      };
      const qs = new URLSearchParams();
      if (merged.q) qs.set("q", merged.q);
      if (merged.platform) qs.set("platform", merged.platform);
      if (merged.category) qs.set("category", merged.category);
      if (merged.provider) qs.set("provider", merged.provider);
      if (merged.status && merged.status !== "all") qs.set("status", merged.status);
      if (merged.sort && merged.sort !== "price_asc") qs.set("sort", merged.sort);

      // Reset to page 1 when changing filters (not when explicitly changing page)
      const isPageChange = Object.keys(params).length === 1 && "page" in params;
      if (isPageChange && merged.page && merged.page !== "1") {
        qs.set("page", merged.page);
      }

      startTr(() => router.push(`${pathname}${qs.size ? `?${qs}` : ""}`));
    },
    [filters, pagination.page, pathname, router],
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ q: val || undefined });
    }, 380);
  }

  const hasActiveFilters =
    !!filters.q || !!filters.platform || !!filters.category || !!filters.provider || filters.status !== "all" || filters.sort !== "price_asc";

  // Pagination page numbers
  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages;
    const cur = pagination.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(cur - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => start + i);
  }, [pagination.page, pagination.totalPages]);

  // Sub-categories for the selected platform
  const platformCategories = useMemo(() => {
    if (!filters.platform) return [];
    return categories
      .filter((c) => c.platformKey === filters.platform)
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [categories, filters.platform]);

  async function handleNormalizeCatalog() {
    setNormalizing(true);
    setNormalizeMsg(null);
    try {
      const result = await normalizeServiceCatalogCategoriesAdmin();
      setNormalizeMsg(
        `${result.moved.toLocaleString("tr-TR")} servis taşındı, ${result.deletedEmptyCategories.toLocaleString("tr-TR")} boş kategori temizlendi.`,
      );
      setTimeout(() => router.refresh(), 600);
    } catch {
      setNormalizeMsg("Kategori normalizasyonu tamamlanamadı.");
    } finally {
      setNormalizing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Servis Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-300">{stats.total.toLocaleString("tr-TR")}</span>{" "}
            servis ·{" "}
            <span className="text-emerald-400 font-semibold">{stats.active.toLocaleString("tr-TR")} aktif</span>{" "}
            ·{" "}
            <span className="text-slate-500">{stats.passive.toLocaleString("tr-TR")} pasif</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BulkPriceUpdateDialog
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              categoryIds: c.categoryIds,
              count: c.count,
            }))}
            providers={providers.map((p) => ({ id: p.id, name: p.name }))}
          />
          <button
            type="button"
            onClick={handleNormalizeCatalog}
            disabled={normalizing}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition-all hover:border-sky-500/30 hover:bg-sky-500/[0.08] disabled:cursor-wait disabled:opacity-60"
            title="Aynı görünen sağlayıcı kategorilerini tek paylaşımlı katalog ağacında birleştirir"
          >
            {normalizing ? <Loader2 size={15} className="animate-spin" /> : <GitMerge size={15} />}
            Kategorileri Birleştir
          </button>
          <ProviderImportDialog
            providers={providers.map((p) => ({ id: p.id, name: p.name, status: p.status, retailMarkupPercent: p.retailMarkupPercent, resellerMarkupPercent: p.resellerMarkupPercent }))}
          />
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Toplam */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Toplam
          </p>
          <p className="text-2xl font-bold text-slate-100 mt-1 tabular-nums">
            {stats.total.toLocaleString("tr-TR")}
          </p>
        </div>

        {/* Aktif */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3">
          <p className="text-[10px] text-emerald-500/70 uppercase tracking-wider font-semibold">
            Aktif
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
            {stats.active.toLocaleString("tr-TR")}
          </p>
          <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.06]">
            <div
              className="h-1 rounded-full bg-emerald-500/50 transition-all"
              style={{
                width: `${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Pasif */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Pasif
          </p>
          <p className="text-2xl font-bold text-slate-400 mt-1 tabular-nums">
            {stats.passive.toLocaleString("tr-TR")}
          </p>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] px-4 py-3">
          <p className="text-[10px] text-sky-400/70 uppercase tracking-wider font-semibold">Platform</p>
          <p className="text-2xl font-bold text-sky-300 mt-1 tabular-nums">{categoryHealth.platformCount.toLocaleString("tr-TR")}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{categoryHealth.categoryCount.toLocaleString("tr-TR")} kategori</p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <p className="text-[10px] text-amber-400/70 uppercase tracking-wider font-semibold">Tekrar Riski</p>
          <p className="text-2xl font-bold text-amber-300 mt-1 tabular-nums">{categoryHealth.duplicateCategoryGroups.toLocaleString("tr-TR")}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{categoryHealth.providerScopedCategoryCount.toLocaleString("tr-TR")} eski kapsam</p>
        </div>
      </div>

      {normalizeMsg && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-2.5 text-sm text-sky-200">
          {normalizeMsg}
        </div>
      )}

      {/* ── Hierarchy Navigator ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] overflow-hidden">

        {/* ── Adım 1: Sağlayıcı ───────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-400 border border-blue-500/30 shrink-0">1</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sağlayıcı</span>
            <span className="ml-auto text-[10px] text-slate-600 tabular-nums">{providers.length} kaynak · {stats.total.toLocaleString("tr-TR")} servis</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {/* Tüm Kaynaklar */}
            <button
              type="button"
              onClick={() => navigate({ provider: undefined, platform: undefined, category: undefined })}
              className={cn(
                "flex-shrink-0 flex flex-col gap-2 rounded-xl px-3.5 py-2.5 border text-left transition-all min-w-[110px]",
                !filters.provider
                  ? "bg-white/10 border-white/[0.18] shadow-sm"
                  : "bg-transparent border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10",
              )}
            >
              <div className="flex items-center gap-2">
                <Globe size={13} className={!filters.provider ? "text-white" : "text-slate-500"} />
                <span className={cn("text-xs font-semibold truncate", !filters.provider ? "text-white" : "text-slate-400")}>Tüm Kaynaklar</span>
              </div>
              <p className={cn("text-xl font-bold tabular-nums leading-none", !filters.provider ? "text-white" : "text-slate-400")}>
                {stats.total.toLocaleString("tr-TR")}
              </p>
              <div className="h-1 rounded-full bg-white/[0.1]">
                <div
                  className={cn("h-1 rounded-full transition-all", !filters.provider ? "bg-white/50" : "bg-white/20")}
                  style={{ width: `${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%` }}
                />
              </div>
              <span className={cn("text-[9px] tabular-nums", !filters.provider ? "text-white/60" : "text-slate-600")}>
                {stats.active.toLocaleString("tr-TR")} aktif
              </span>
            </button>

            {/* Provider cards */}
            {stats.byProvider.map((prov) => {
              const isActive = filters.provider === prov.id;
              const ratio = prov.totalCount > 0 ? Math.round((prov.activeCount / prov.totalCount) * 100) : 0;
              const badgeClass = PROVIDER_BADGE[prov.code] ?? "bg-slate-500/15 text-slate-400 border-slate-500/25";
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => navigate({ provider: isActive ? undefined : prov.id, platform: undefined, category: undefined })}
                  className={cn(
                    "flex-shrink-0 flex flex-col gap-2 rounded-xl px-3.5 py-2.5 border text-left transition-all min-w-[140px]",
                    isActive
                      ? "bg-white/[0.07] border-white/[0.18] shadow-sm"
                      : "bg-transparent border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold border shrink-0", badgeClass)}>
                      {prov.code}
                    </span>
                    <span
                      className={cn("flex-1 min-w-0 truncate text-xs font-semibold", isActive ? "text-slate-100" : "text-slate-400")}
                      title={prov.name}
                    >
                      {prov.name}
                    </span>
                    {isActive && <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />}
                  </div>
                  <p className={cn("text-xl font-bold tabular-nums leading-none", isActive ? "text-slate-100" : "text-slate-400")}>
                    {prov.totalCount.toLocaleString("tr-TR")}
                  </p>
                  <div className="h-1 rounded-full bg-white/[0.06]">
                    <div className="h-1 rounded-full bg-sky-400/50 transition-all" style={{ width: `${ratio}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-600 tabular-nums">
                    {prov.activeCount.toLocaleString("tr-TR")} aktif · %{ratio}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/[0.04]" />

        {/* ── Adım 2: Platform ─────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-400 border border-violet-500/30 shrink-0">2</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Platform</span>
            <span className="ml-auto text-[10px] text-slate-600 tabular-nums">{platforms.length} platform</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {/* Tümü */}
            <button
              type="button"
              onClick={() => navigate({ platform: undefined, category: undefined })}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 border text-center transition-all min-w-[72px]",
                !filters.platform
                  ? "bg-white/10 border-white/20 text-white shadow-sm"
                  : "bg-transparent border-white/[0.06] text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 hover:border-white/10",
              )}
            >
              <Globe size={18} className={!filters.platform ? "text-white" : "text-slate-500"} />
              <span className="text-[10px] font-semibold leading-none">Tümü</span>
              <span className={cn("text-[9px] tabular-nums leading-none", !filters.platform ? "text-white/60" : "text-slate-600")}>
                {stats.total.toLocaleString("tr-TR")}
              </span>
            </button>

            {/* Platform cards */}
            {platforms.map((plt) => {
              const isActive = filters.platform === plt.key;
              const colorClasses = getPlatformColor(plt.name);
              const textColor = colorClasses.split(" ").find((c) => c.startsWith("text-")) ?? "text-slate-400";
              return (
                <button
                  key={plt.key}
                  type="button"
                  onClick={() => navigate({ platform: plt.key, category: undefined })}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 border text-center transition-all min-w-[72px]",
                    isActive
                      ? `bg-gradient-to-b ${colorClasses.split(" ").filter((c) => c.startsWith("from-") || c.startsWith("to-") || c.startsWith("border-")).join(" ")} shadow-sm`
                      : "bg-transparent border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10",
                  )}
                >
                  <span className={cn("transition-colors", isActive ? textColor : "text-slate-500")}>
                    {getPlatformIcon(plt.name, "md")}
                  </span>
                  <span className={cn("text-[10px] font-semibold leading-none truncate max-w-[64px]", isActive ? textColor : "text-slate-400")}>
                    {plt.name}
                  </span>
                  <span className={cn("text-[9px] tabular-nums leading-none", isActive ? "opacity-60" : "text-slate-600")}>
                    {plt.count.toLocaleString("tr-TR")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Adım 3: Kategori (platform seçilince görünür) ────────────── */}
        {filters.platform && platformCategories.length > 0 && (
          <>
            <div className="border-t border-white/[0.04]" />
            <div className="px-4 pt-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[10px] font-bold text-sky-400 border border-sky-500/30 shrink-0">3</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kategori</span>
                {filters.category && (
                  <button
                    type="button"
                    onClick={() => navigate({ category: undefined })}
                    className="ml-1 text-[9px] text-slate-600 hover:text-slate-400 transition-colors underline"
                  >
                    temizle
                  </button>
                )}
                <span className="ml-auto text-[9px] text-slate-600">{platformCategories.length} kategori</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate({ category: undefined })}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all",
                    !filters.category
                      ? "bg-white/10 text-white border-white/20"
                      : "bg-transparent text-slate-500 border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-300",
                  )}
                >
                  Tümü
                </button>
                {platformCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => navigate({ category: cat.id })}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all",
                      filters.category === cat.id
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                        : "bg-transparent text-slate-500 border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-300",
                    )}
                  >
                    {cat.name}
                    <span className="ml-1 text-[10px] opacity-60 tabular-nums">{cat.count.toLocaleString("tr-TR")}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={13} className="text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Filtreler</span>
          {hasActiveFilters && (
            <button
              onClick={() => navigate({ q: undefined, platform: undefined, category: undefined, provider: undefined, status: "all", sort: "price_asc" })}
              className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RotateCcw size={11} />
              Tümünü temizle
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <Input
              defaultValue={filters.q}
              onChange={handleSearchChange}
              placeholder="Servis adı ara…"
              className="pl-9 h-9 text-sm bg-white/[0.03] border-white/[0.08] focus:border-blue-500/30 focus:ring-blue-500/10"
            />
            {isPending && (
              <Loader2
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin"
              />
            )}
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={filters.status}
              onChange={(e) => navigate({ status: e.target.value })}
              className={cn(
                "h-9 rounded-lg border px-3 text-xs cursor-pointer transition-colors",
                filters.status === "active"
                  ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300"
                  : filters.status === "passive"
                    ? "border-slate-500/30 bg-slate-500/[0.06] text-slate-400"
                    : "border-white/[0.08] bg-[#0f1117] text-slate-300 hover:border-white/[0.14]",
              )}
            >
              <option value="all">Tüm durumlar</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>

            <select
              value={filters.sort}
              onChange={(e) => navigate({ sort: e.target.value })}
              className="h-9 rounded-lg border border-white/[0.08] bg-[#0f1117] px-3 text-xs text-slate-300 cursor-pointer hover:border-white/[0.14] transition-colors"
            >
              <option value="category">Kategori sırasına göre</option>
              <option value="price_asc">Maliyet ↑ (ucuzdan pahalıya)</option>
              <option value="price_desc">Maliyet ↓ (pahalıdan ucuza)</option>
              <option value="retail_asc">Perakende ↑</option>
              <option value="retail_desc">Perakende ↓</option>
              <option value="name_asc">Ad A→Z</option>
              <option value="name_desc">Ad Z→A</option>
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex gap-1.5 flex-wrap mt-2.5 pt-2.5 border-t border-white/[0.04]">
            {filters.q && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-2.5 py-0.5 text-[10px] text-blue-300">
                Ara: <strong>{filters.q}</strong>
                <button onClick={() => navigate({ q: undefined })} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
            {filters.platform && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-2.5 py-0.5 text-[10px] text-violet-300">
                Platform: <strong className="capitalize">{filters.platform}</strong>
                <button onClick={() => navigate({ platform: undefined, category: undefined })} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/[0.08] px-2.5 py-0.5 text-[10px] text-sky-300">
                Kategori: <strong>{platformCategories.find((c) => c.id === filters.category)?.name ?? filters.category}</strong>
                <button onClick={() => navigate({ category: undefined })} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
            {filters.provider && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-2.5 py-0.5 text-[10px] text-amber-300">
                Sağlayıcı: <strong>{providers.find((p) => p.id === filters.provider)?.name ?? filters.provider}</strong>
                <button onClick={() => navigate({ provider: undefined })} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
            {filters.status !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-0.5 text-[10px] text-emerald-300">
                Durum: <strong>{filters.status === "active" ? "Aktif" : "Pasif"}</strong>
                <button onClick={() => navigate({ status: "all" })} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Results info bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
          <span
            className="cursor-pointer hover:text-slate-300 transition-colors"
            onClick={() => navigate({ provider: undefined, platform: undefined, category: undefined })}
          >
            Tüm Kaynaklar
          </span>
          {filters.provider && (
            <>
              <ChevronRight size={12} className="text-slate-700 shrink-0" />
              <span
                className="cursor-pointer hover:text-slate-300 transition-colors"
                onClick={() => navigate({ platform: undefined, category: undefined })}
              >
                {providers.find((p) => p.id === filters.provider)?.name ?? filters.provider}
              </span>
            </>
          )}
          {filters.platform && (
            <>
              <ChevronRight size={12} className="text-slate-700 shrink-0" />
              <span
                className="cursor-pointer hover:text-slate-300 transition-colors capitalize"
                onClick={() => navigate({ category: undefined })}
              >
                {filters.platform}
              </span>
            </>
          )}
          {filters.category && (
            <>
              <ChevronRight size={12} className="text-slate-700 shrink-0" />
              <span className="text-slate-400 truncate">
                {platformCategories.find((c) => c.id === filters.category)?.name ?? "Kategori"}
              </span>
            </>
          )}
        </div>
        <span className="ml-auto text-xs text-slate-600 tabular-nums shrink-0">
          {pagination.totalCount.toLocaleString("tr-TR")} servis
          {pagination.totalPages > 1 && (
            <span className="text-slate-700"> · Sayfa {pagination.page}/{pagination.totalPages}</span>
          )}
        </span>
      </div>

      {/* ── Bulk action bar ────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/25 bg-blue-500/[0.06] px-4 py-2.5">
          <span className="text-sm font-semibold text-blue-300">
            {selectedCount} servis seçildi
          </span>
          {bulkMsg && (
            <span className="text-xs text-slate-400 italic">{bulkMsg}</span>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleBulkStatus(true)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              {bulkLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              Aktifleştir
            </button>
            <button
              onClick={() => handleBulkStatus(false)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30 transition-all disabled:opacity-50"
            >
              {bulkLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <XCircle size={12} />
              )}
              Deaktif Et
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center text-xs text-slate-500 hover:text-slate-300 transition-colors px-1"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] overflow-hidden">
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <Package size={40} className="opacity-20" />
            <p className="text-sm">Servis bulunamadı.</p>
            {hasActiveFilters && (
              <button
                onClick={() =>
                  navigate({ q: undefined, platform: undefined, category: undefined, provider: undefined, status: "all", sort: "price_asc" })
                }
                className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw size={11} />
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.025]">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-500 hover:text-slate-200 transition-colors"
                    >
                      {allSelected ? (
                        <CheckSquare size={14} className="text-blue-400" />
                      ) : someSelected ? (
                        <Minus size={14} className="text-blue-400" />
                      ) : (
                        <Square size={14} />
                      )}
                    </button>
                  </th>
                  <th className="py-3 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Servis
                  </th>
                  <th className="py-3 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Kategori
                  </th>
                  <th className="py-3 pr-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-14">
                    Kay.
                  </th>
                  <th className="py-3 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Maliyet
                  </th>
                  <th className="py-3 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Perakende
                  </th>
                  <th className="py-3 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Bayi
                  </th>
                  <th className="py-3 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-24">
                    Min / Max
                  </th>
                  <th className="py-3 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-24">
                    Durum
                  </th>
                  <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <ServiceEditRow
                    key={svc.id}
                    service={svc}
                    selected={selectedIds.has(svc.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Sayfa{" "}
            <span className="font-semibold text-slate-300">{pagination.page}</span>
            {" / "}
            <span className="font-semibold text-slate-300">{pagination.totalPages}</span>
            {" · "}
            Toplam{" "}
            <span className="font-semibold text-slate-300">
              {pagination.totalCount.toLocaleString("tr-TR")}
            </span>{" "}
            servis
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate({ page: String(pagination.page - 1) })}
              disabled={pagination.page <= 1 || isPending}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
              Önceki
            </button>

            {pageNumbers[0] > 1 && (
              <>
                <button
                  onClick={() => navigate({ page: "1" })}
                  className="h-9 w-9 rounded-lg text-sm border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
                >
                  1
                </button>
                {pageNumbers[0] > 2 && (
                  <span className="text-slate-600 text-sm px-1">…</span>
                )}
              </>
            )}

            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => navigate({ page: String(p) })}
                disabled={isPending}
                className={cn(
                  "h-9 w-9 rounded-lg text-sm border transition-all",
                  p === pagination.page
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30 font-semibold"
                    : "border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]",
                )}
              >
                {p}
              </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < pagination.totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < pagination.totalPages - 1 && (
                  <span className="text-slate-600 text-sm px-1">…</span>
                )}
                <button
                  onClick={() => navigate({ page: String(pagination.totalPages) })}
                  className="h-9 w-9 rounded-lg text-sm border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
                >
                  {pagination.totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => navigate({ page: String(pagination.page + 1) })}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Sonraki
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
