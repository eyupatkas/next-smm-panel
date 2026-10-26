import Link from "next/link";
import {
  ShoppingCart,
  Eye,
  Zap,
  Shield,
  Star,
} from "lucide-react";
import { formatPrice, type Currency } from "@/lib/currency";
import {
  buildServiceUrl,
  pricingModeFor,
  type PublicServiceCardRow,
} from "@/lib/services/service-list-data";
import { calculateClientCharge, unitPriceSuffix } from "@/lib/client-pricing";
import { PlatformVisual, getPlatformPalette } from "./PlatformVisual";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";

export function ServiceProductCard({
  service,
  basePath,
  currency,
  intlLocale,
  unitPrice,
}: {
  service: PublicServiceCardRow;
  basePath: string;
  currency: Currency;
  intlLocale: string;
  /** role-aware unit price to display; falls back to retailPrice or price */
  unitPrice?: number;
}) {
  const platformName =
    service.category.parent?.name ?? service.category.name ?? "";
  const palette = getPlatformPalette(platformName);
  const href = buildServiceUrl(basePath, service);
  const price = unitPrice ?? service.retailPrice ?? service.price ?? 0;
  const pricingMode = pricingModeFor(service);
  // Tiny cosmetic "list price" 12% above for that e-commerce vibe
  const listPrice = price > 0 ? price * 1.12 : 0;
  const minOrderTotal = calculateClientCharge(price, service.min, pricingMode);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${palette.border}`}
    >
      {/* Image / visual */}
      <Link
        href={href}
        className="relative block overflow-hidden"
        aria-label={service.name}
      >
        <PlatformVisual platformName={platformName} size="lg" />
        {/* Top-left badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-slate-100">
            <Zap size={10} className="text-amber-500" />
            Hızlı
          </span>
          {service.canRefill && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              <Shield size={10} />
              Garantili
            </span>
          )}
        </div>
        {/* Top-right discount sticker */}
        {price > 0 && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
            %12 İndirim
          </span>
        )}
        {/* Hover overlay with quick action */}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-10 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 shadow">
            <Eye size={12} />
            İncele
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        {/* category breadcrumb mini */}
        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className={palette.accentText}>{platformName}</span>
          {service.category.parent && (
            <>
              <span className="opacity-40">/</span>
              <span>{service.category.name}</span>
            </>
          )}
        </p>

        <Link
          href={href}
          className="line-clamp-2 min-h-[2.4rem] text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary"
        >
          {service.name}
        </Link>

        {/* Mock rating row — purely visual trust signal */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="flex items-center text-amber-500">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={10} fill="currentColor" strokeWidth={0} />
            ))}
          </span>
          <span>4.9</span>
          <span className="opacity-50">·</span>
          <span>1.2K+ sipariş</span>
        </div>

        {/* Min/Max */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <span className="rounded-lg bg-muted/40 px-2 py-1 text-muted-foreground">
            Min{" "}
            <strong className="text-foreground">
              {service.min.toLocaleString("tr-TR")}
            </strong>
          </span>
          <span className="rounded-lg bg-muted/40 px-2 py-1 text-muted-foreground">
            Max{" "}
            <strong className="text-foreground">
              {service.max.toLocaleString("tr-TR")}
            </strong>
          </span>
        </div>

        {/* Price block */}
        <div className="mt-auto space-y-2 pt-1">
          <div className="flex items-end gap-2">
            <p className={`text-xl font-extrabold leading-none ${palette.accentText}`}>
              {formatPrice(price, currency, intlLocale)}
            </p>
            {listPrice > price && (
              <p className="text-[11px] text-muted-foreground line-through">
                {formatPrice(listPrice, currency, intlLocale)}
              </p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {unitPriceSuffix(pricingMode)} • Min sipariş{" "}
            <strong className="text-foreground">
              {formatPrice(minOrderTotal, currency, intlLocale)}
            </strong>
          </p>

          {/* Action buttons */}
          <div className="flex gap-1.5 pt-1">
            <FavoriteToggleButton serviceId={service.id} className="h-9 w-9 rounded-xl" />
            <Link
              href={href}
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-background text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Eye size={13} />
              Detay
            </Link>
            <Link
              href={href}
              className={`flex h-9 flex-[1.6] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${palette.cta} text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]`}
            >
              <ShoppingCart size={13} />
              Satın Al
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
