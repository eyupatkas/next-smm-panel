import Link from "next/link";
import { ChevronRight, Layers, Star, Tag } from "lucide-react";
import {
  buildCategoryUrl,
  publicListBasePath,
  type SortKey,
} from "@/lib/services/service-list-data";
import { publicCategorySegment } from "@/lib/public-service-slugs";
import { getPlatformPalette } from "./PlatformVisual";
import { getPlatformIcon } from "@/lib/platform-icons";

export type SidebarPlatform = {
  id: string;
  name: string;
  slug: string | null;
  totalServices: number;
  children: {
    id: string;
    name: string;
    slug: string | null;
    count: number;
  }[];
};

type Props = {
  locale: string;
  platforms: SidebarPlatform[];
  /** id of the platform that's currently active (root category) */
  activePlatformId: string | null;
  /** id of the active sub-category, if any */
  activeSubCategoryId: string | null;
  /** currently active sort */
  sort: SortKey;
  /** Builds an href that switches sort while preserving everything else */
  buildSortHref: (sort: SortKey) => string;
};

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "popular", label: "Popüler", icon: <Star size={12} /> },
  { key: "cheap", label: "En Ucuz", icon: <Tag size={12} /> },
  { key: "expensive", label: "En Pahalı", icon: <Tag size={12} /> },
  { key: "name", label: "İsme Göre", icon: <Layers size={12} /> },
];

export function CatalogSidebar({
  locale,
  platforms,
  activePlatformId,
  activeSubCategoryId,
}: Omit<Props, "sort" | "buildSortHref">) {
  const basePath = publicListBasePath(locale);
  const activePlatform =
    platforms.find((p) => p.id === activePlatformId) ?? null;

  return (
    <aside className="space-y-4">
      {/* Tüm hizmetler */}
      <Link
        href={basePath}
        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition-colors ${
          !activePlatformId
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:bg-muted"
        }`}
      >
        <span className="flex items-center gap-2">
          <Layers size={14} />
          Tüm Hizmetler
        </span>
        <ChevronRight size={14} className="opacity-60" />
      </Link>

      {/* Platform list */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Platformlar
          </p>
        </div>
        <ul className="max-h-[520px] overflow-y-auto p-1.5">
          {platforms.map((platform) => {
            const isActive = activePlatformId === platform.id;
            const palette = getPlatformPalette(platform.name);
            return (
              <li key={platform.id}>
                <Link
                  href={buildCategoryUrl(basePath, platform)}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? `${palette.accentText} bg-muted/60`
                      : "text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${palette.tileGradient}`}
                    >
                      {getPlatformIcon(platform.name, "sm")}
                    </span>
                    <span className="truncate">{platform.name}</span>
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {platform.totalServices.toLocaleString("tr-TR")}
                  </span>
                </Link>
                {/* Sub-categories of the active platform */}
                {isActive && platform.children.length > 0 && (
                  <ul className="mb-1 ml-9 space-y-0.5 border-l border-border pl-3">
                    <li>
                      <Link
                        href={buildCategoryUrl(basePath, platform)}
                        className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                          !activeSubCategoryId
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <span>Tüm {platform.name}</span>
                      </Link>
                    </li>
                    {platform.children.map((child) => {
                      const sub = activeSubCategoryId === child.id;
                      return (
                        <li key={child.id}>
                          <Link
                            href={`${basePath}/${publicCategorySegment(platform)}/${publicCategorySegment(child)}`}
                            className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                              sub
                                ? "bg-primary/10 font-semibold text-primary"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                          >
                            <span className="truncate">{child.name}</span>
                            <span className="text-[10px]">
                              {child.count}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Trust card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-blue-500/5 p-4 text-xs leading-6 text-muted-foreground">
        <p className="mb-1 text-sm font-semibold text-foreground">
          🔒 Güvenli Alışveriş
        </p>
        Tüm ödemeler şifreli kanaldan işlenir. Hesap güvenliğiniz için parola
        ya da doğrulama kodu istemiyoruz.
      </div>

      {activePlatform && (
        <div className="rounded-2xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
          <p className="mb-1 text-sm font-semibold text-foreground">
            {activePlatform.name} Hakkında
          </p>
          {activePlatform.totalServices.toLocaleString("tr-TR")} aktif hizmet
          ile en geniş {activePlatform.name} kataloğunu sunuyoruz.
        </div>
      )}
    </aside>
  );
}

export function SortBar({
  totalCount,
  page,
  perPage,
  sort,
  buildSortHref,
}: {
  totalCount: number;
  page: number;
  perPage: number;
  sort: SortKey;
  buildSortHref: (sort: SortKey) => string;
}) {
  const start = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalCount);

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          {start.toLocaleString("tr-TR")}-{end.toLocaleString("tr-TR")}
        </span>{" "}
        / {totalCount.toLocaleString("tr-TR")} hizmet
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          Sırala:
        </span>
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.key;
          return (
            <Link
              key={opt.key}
              href={buildSortHref(opt.key)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {opt.icon}
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
