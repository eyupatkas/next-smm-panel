"use client";

import { Link } from "@/i18n/navigation";
import { useFavorites } from "@/context/FavoritesContext";
import { formatPrice, type Currency } from "@/lib/currency";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";
import { type PublicServiceCardRow } from "@/lib/services/service-list-data";
import { ArrowUpRight, Heart, ShoppingCart } from "lucide-react";

type FavoriteCatalogService = PublicServiceCardRow & {
  href: string;
  unitPrice: number;
};

type FavoriteCatalogClientProps = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyHref: string;
  emptyLabel: string;
  locale: string;
  currency: Currency;
  intlLocale: string;
  initialFavoriteIds: string[];
  services: FavoriteCatalogService[];
};

export function FavoriteCatalogClient({
  title,
  description,
  emptyTitle,
  emptyDescription,
  emptyHref,
  emptyLabel,
  locale,
  currency,
  intlLocale,
  initialFavoriteIds,
  services,
}: FavoriteCatalogClientProps) {
  const { favoriteIds, isLoaded } = useFavorites();

  const activeIds = isLoaded ? favoriteIds : initialFavoriteIds;
  const activeIdSet = new Set(activeIds);
  const visibleServices = services.filter((service) => activeIdSet.has(service.id));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <Heart size={12} fill="currentColor" />
              {activeIds.length.toLocaleString("tr-TR")} favori servis
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          </div>
          <Link
            href={emptyHref as Parameters<typeof Link>[0]["href"]}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Yeni servis kesfet
          </Link>
        </div>
      </div>

      {visibleServices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <Heart size={22} />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-foreground">{emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{emptyDescription}</p>
          <Link
            href={emptyHref as Parameters<typeof Link>[0]["href"]}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {emptyLabel}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleServices.map((service) => (
            <article
              key={service.id}
              className="flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {service.category.parent?.name ?? service.category.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-lg font-semibold text-foreground">
                    {service.name}
                  </p>
                </div>
                <FavoriteToggleButton serviceId={service.id} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 px-3 py-2">
                  Min <strong className="text-foreground">{service.min.toLocaleString("tr-TR")}</strong>
                </div>
                <div className="rounded-2xl bg-muted/40 px-3 py-2">
                  Max <strong className="text-foreground">{service.max.toLocaleString("tr-TR")}</strong>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-muted/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  1.000 adet fiyatı
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                  {formatPrice(service.unitPrice, currency, intlLocale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {service.category.parent?.name ?? service.category.name} / {service.category.name}
                </p>
              </div>

              <div className="mt-auto flex gap-2 pt-5">
                <Link
                  href={service.href as Parameters<typeof Link>[0]["href"]}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <ArrowUpRight size={16} />
                  Detay
                </Link>
                <Link
                  href={service.href as Parameters<typeof Link>[0]["href"]}
                  className="inline-flex h-11 flex-[1.2] items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <ShoppingCart size={16} />
                  Satin Al
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}