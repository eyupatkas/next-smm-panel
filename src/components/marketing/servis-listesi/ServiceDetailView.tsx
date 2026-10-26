import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  ShieldCheck,
  Star,
  Truck,
  Award,
} from "lucide-react";
import { formatPrice, type Currency } from "@/lib/currency";
import {
  buildCategoryUrl,
  type PublicServiceDetail,
  type PublicServiceCardRow,
  publicListBasePath,
} from "@/lib/services/service-list-data";
import {
  publicCategorySegment,
  publicServiceSegment,
} from "@/lib/public-service-slugs";
import { Breadcrumb } from "./Breadcrumb";
import { PlatformVisual, getPlatformPalette } from "./PlatformVisual";
import { PurchasePanel } from "./PurchasePanel";
import { getLinkPlaceholder } from "./link-placeholder";
import { ServiceProductCard } from "./ServiceProductCard";
import { ServiceFaq, buildServiceFaqs } from "./ServiceFaq";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";
import { ShareButton } from "@/components/shared/ShareButton";
import {
  ServiceReviews,
  type SerializedReview,
} from "./ServiceReviews";
import type { ReviewStats } from "@/lib/reviews";

export function ServiceDetailView({
  locale,
  service,
  unitPrice,
  pricingMode,
  isLoggedIn,
  userBalance,
  currency,
  intlLocale,
  related,
  unitPriceForRelated,
  reviewStats,
  reviews,
  totalSold,
}: {
  locale: string;
  service: PublicServiceDetail;
  unitPrice: number;
  pricingMode: "PER_THOUSAND" | "PER_UNIT";
  isLoggedIn: boolean;
  userBalance: number;
  currency: Currency;
  intlLocale: string;
  related: PublicServiceCardRow[];
  unitPriceForRelated: (s: PublicServiceCardRow) => number;
  reviewStats: ReviewStats;
  reviews: SerializedReview[];
  totalSold: number;
}) {
  const basePath = publicListBasePath(locale);
  const category = service.category;
  const parent = category.parent;
  const platformName = parent?.name ?? category.name;
  const palette = getPlatformPalette(platformName);

  const topSeg = publicCategorySegment(parent ?? category);
  const leafSeg = parent ? publicCategorySegment(category) : topSeg;
  const serviceHref = parent
    ? `${basePath}/${topSeg}/${leafSeg}/${publicServiceSegment(service)}`
    : `${basePath}/${topSeg}/${publicServiceSegment(service)}`;

  const breadcrumbs = [
    { label: "Servis Listesi", href: basePath },
    ...(parent
      ? [
          { label: parent.name, href: `${basePath}/${topSeg}` },
          {
            label: category.name,
            href: `${basePath}/${topSeg}/${leafSeg}`,
          },
        ]
      : [{ label: category.name, href: `${basePath}/${topSeg}` }]),
    { label: service.name },
  ];

  const description =
    service.description ||
    `${service.name} hizmeti, ${platformName} platformu için minimum ${service.min.toLocaleString("tr-TR")} ve maksimum ${service.max.toLocaleString("tr-TR")} adet sipariş ile sunulur. Sipariş onaylandıktan sonra otomatik olarak işleme alınır; teslimat birkaç dakika ile saatler arasında tamamlanır.`;

  const listPrice = unitPrice * 1.12;

  const faqs = buildServiceFaqs({
    serviceName: service.name,
    platform: platformName,
    min: service.min,
    max: service.max,
    canRefill: service.canRefill,
    canCancel: service.canCancel,
  });

  return (
    <div
      className="mx-auto w-full px-4 md:px-6"
      style={{ maxWidth: "1536px" }}
    >
      <Breadcrumb items={breadcrumbs} />

      {/* Top: Gallery (left) + Title/Buy (right) */}
      <article
        className="service-detail-main"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "1.5rem",
        }}
      >
        {/* ── LEFT: Gallery ─────────────────────────────────────────────── */}
        <section
          aria-label="Hizmet görseli"
          className="service-detail-gallery space-y-3"
          style={{ flex: "0 0 min(420px, 100%)", minWidth: 0 }}
        >
          <div
            className={`relative overflow-hidden rounded-3xl border bg-card shadow-sm ${palette.border}`}
          >
            <PlatformVisual platformName={platformName} size="xl" />
            <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-md backdrop-blur dark:bg-slate-900/90 dark:text-slate-100">
                <Award size={11} className="text-amber-500" />
                Kalite Onaylı
              </span>
              {service.canRefill && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white shadow-md">
                  <ShieldCheck size={11} />
                  Telafi Garantili
                </span>
              )}
            </div>
            <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-[11px] font-bold text-white shadow-md">
              %12 İndirim
            </span>
          </div>

          {/* Thumbnail strip — feature highlights */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Truck size={16} />, label: "Hızlı" },
              { icon: <ShieldCheck size={16} />, label: "Garantili" },
              { icon: <RefreshCcw size={16} />, label: "Telafi" },
              { icon: <Award size={16} />, label: "Onaylı" },
            ].map((t, i) => (
              <div
                key={i}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border bg-card py-3 text-[10px] font-semibold text-foreground shadow-sm transition-colors ${
                  i === 0 ? palette.border : "border-border"
                }`}
              >
                <span className={palette.accentText}>{t.icon}</span>
                {t.label}
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-bold text-foreground">Özellikler</h2>
            <dl className="divide-y divide-border/60 text-sm">
              <SpecRow
                label="Min. Sipariş"
                value={service.min.toLocaleString("tr-TR")}
              />
              <SpecRow
                label="Maks. Sipariş"
                value={service.max.toLocaleString("tr-TR")}
              />
              <SpecRow
                label="Servis Tipi"
                value={service.serviceType || "Standart"}
              />
              <SpecRow label="Kategori" value={category.name} />
              <SpecRow
                label="Düşüş telafisi"
                value={service.canRefill ? "Destekleniyor" : "Desteklenmiyor"}
                ok={service.canRefill}
              />
              <SpecRow
                label="İptal"
                value={service.canCancel ? "Destekleniyor" : "Desteklenmiyor"}
                ok={service.canCancel}
              />
              <SpecRow
                label="Drip-Feed"
                value={service.hasDripfeed ? "Destekleniyor" : "Desteklenmiyor"}
                ok={service.hasDripfeed}
              />
              <SpecRow
                label="Tahmini Süre"
                value={
                  service.avgCompletionMinutes
                    ? formatMinutes(service.avgCompletionMinutes)
                    : "Hızlı"
                }
              />
            </dl>
          </div>
        </section>

        {/* ── RIGHT: Title + Price + Buy ────────────────────────────────── */}
        <section
          aria-label="Sipariş paneli"
          className="service-detail-purchase space-y-4"
          style={{ flex: "1 1 760px", minWidth: 0 }}
        >
          <div className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${palette.border} ${palette.accentText}`}
                >
                  {platformName}
                </span>
                <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {category.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <FavoriteToggleButton serviceId={service.id} />
                <ShareButton title={service.name} url={serviceHref} />
              </div>
            </div>

            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-foreground md:text-2xl">
              {service.name}
            </h1>

            {/* Real rating row (uses ServiceReview data; falls back gracefully) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {reviewStats.count > 0 ? (
                <a href="#reviews" className="flex items-center gap-1 hover:underline">
                  <span className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        fill={s <= Math.round(reviewStats.average) ? "currentColor" : "none"}
                        strokeWidth={1.5}
                      />
                    ))}
                  </span>
                  <strong className="text-foreground">{reviewStats.average.toFixed(1)}</strong>
                  <span>({formatReviewCount(reviewStats.count)} değerlendirme)</span>
                </a>
              ) : (
                <a href="#reviews" className="flex items-center gap-1 text-muted-foreground hover:underline">
                  <span className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} strokeWidth={1.5} />
                    ))}
                  </span>
                  <span>İlk yorumu sen yaz</span>
                </a>
              )}
              {totalSold > 0 && (
                <>
                  <span className="opacity-50">·</span>
                  <span>
                    <strong className="text-foreground">{formatSoldCount(totalSold)}</strong> satıldı
                  </span>
                </>
              )}
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Stokta
              </span>
            </div>

            {/* Price block */}
            <div className="rounded-2xl bg-gradient-to-br from-muted/40 to-transparent p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Birim fiyat (1.000 adet)
              </p>
              <div className="mt-1 flex flex-wrap items-end gap-2">
                <span
                  className={`text-3xl font-extrabold leading-none ${palette.accentText} md:text-4xl`}
                >
                  {formatPrice(unitPrice, currency, intlLocale)}
                </span>
                {listPrice > unitPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(listPrice, currency, intlLocale)}
                  </span>
                )}
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  %12 İNDİRİM
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Min sipariş: {service.min.toLocaleString("tr-TR")} • Max:{" "}
                {service.max.toLocaleString("tr-TR")}
              </p>
            </div>

          </div>

          {/* Buy form */}
          <PurchasePanel
            service={{
              id: service.id,
              name: service.name,
              categoryName: category.name,
              parentCategoryName: parent?.name,
              min: service.min,
              max: service.max,
              unitPrice,
              pricingMode,
              currency,
              intlLocale,
              serviceType: service.serviceType,
              linkPlaceholder: getLinkPlaceholder(platformName),
            }}
            ctaGradient={palette.cta}
            isLoggedIn={isLoggedIn}
            userBalance={userBalance}
          />
        </section>
      </article>

      <section className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-bold text-foreground">
          Hizmet Açıklaması
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
          <p>{description}</p>
          <p>
            <strong className="text-foreground">Nasıl çalışır?</strong>{" "}
            Sipariş verirken yalnızca {platformName} üzerindeki herkese açık
            profil veya gönderi bağlantınızı ve istediğiniz miktarı girmeniz
            yeterli. Sipariş onaylandıktan sonra otomatik sistemimiz teslimatı
            başlatır; gelişmeyi panelinizden izleyebilirsiniz.
          </p>
          <p>
            <strong className="text-foreground">Güvenlik.</strong> Hesap
            güvenliğiniz gözetilir; hiçbir koşulda parola, e-posta veya
            doğrulama kodu istenmez. Yalnızca herkese açık bağlantılar
            üzerinden çalışan altyapımız {platformName} kurallarıyla uyumlu
            olacak şekilde tasarlanmıştır.
          </p>
          <p>
            <strong className="text-foreground">Garanti.</strong>{" "}
            {service.canRefill
              ? "Bu hizmette teslimat sonrası belirli süre içinde yaşanan düşüşler ücretsiz telafi kapsamındadır; tek tıkla telafi talebi oluşturabilirsiniz."
              : "Bu hizmette otomatik telafi bulunmuyor. Düşüş yaşarsanız destek ekibimizle iletişime geçebilirsiniz."}
          </p>
          </div>
      </section>

      {/* User reviews */}
      <ServiceReviews
        serviceId={service.id}
        serviceName={service.name}
        initialStats={reviewStats}
        initialReviews={reviews}
        isLoggedIn={isLoggedIn}
      />

      {/* FAQ */}
      <div className="mt-8">
        <ServiceFaq faqs={faqs} />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bu Kategoriden
              </p>
              <h2 className="text-xl font-bold text-foreground md:text-2xl">
                Benzer Hizmetler
              </h2>
            </div>
            <Link
              href={buildCategoryUrl(basePath, parent ?? category)}
              className={`text-xs font-medium hover:underline ${palette.accentText}`}
            >
              Tümünü Gör →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {related.map((s) => (
              <ServiceProductCard
                key={s.id}
                service={s}
                basePath={basePath}
                currency={currency}
                intlLocale={intlLocale}
                unitPrice={unitPriceForRelated(s)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SpecRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`flex items-center gap-1.5 text-xs font-semibold ${
          ok === true
            ? "text-emerald-700 dark:text-emerald-400"
            : ok === false
              ? "text-muted-foreground"
              : "text-foreground"
        }`}
      >
        {ok === true && <CheckCircle2 size={12} />}
        {ok === false && <XCircle size={12} className="opacity-50" />}
        {value}
      </dd>
    </div>
  );
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} dk`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
}

function formatReviewCount(n: number): string {
  if (n < 1000) return n.toLocaleString("tr-TR");
  return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
}

function formatSoldCount(n: number): string {
  if (n < 1000) return n.toLocaleString("tr-TR");
  if (n < 1_000_000) return `${Math.floor(n / 1000)}K+`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
}
