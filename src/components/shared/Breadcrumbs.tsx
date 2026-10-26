import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import Script from "next/script";
import { SITE_URL } from "@/lib/seo";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  /** Schema.org BreadcrumbList JSON-LD'yi otomatik ekle */
  withJsonLd?: boolean;
  /** Bu locale ile mutlak URL üretilir (JSON-LD için). Verilmezse default kullanılır. */
  locale?: string;
  className?: string;
};

/**
 * Erişilebilir, SEO uyumlu görsel breadcrumb. Schema.org BreadcrumbList JSON-LD'yi
 * opsiyonel olarak otomatik üretir. `aria-label="breadcrumb"` ve `<ol>` semantiği
 * Google'ın breadcrumbs zengin sonuçları için ideal yapı.
 */
export function Breadcrumbs({ items, withJsonLd = true, locale = "tr", className }: Props) {
  if (!items || items.length === 0) return null;

  const localePrefix = locale === "tr" ? "" : `/${locale}`;
  const homeHref = locale === "tr" ? "/" : `/${locale}`;

  const jsonLd = withJsonLd
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Ana Sayfa",
            item: `${SITE_URL}${homeHref === "/" ? "/" : homeHref}`,
          },
          ...items.map((item, idx) => ({
            "@type": "ListItem",
            position: idx + 2,
            name: item.label,
            item: item.href
              ? `${SITE_URL}${localePrefix}${item.href.startsWith("/") ? item.href : `/${item.href}`}`
              : undefined,
          })),
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <Script
          id={`breadcrumb-jsonld-${items.map((i) => i.label).join("-").slice(0, 50)}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <nav aria-label="breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
          <li className="flex items-center">
            <Link
              href={homeHref}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Home size={14} aria-hidden />
              <span className="sr-only sm:not-sr-only">Ana Sayfa</span>
            </Link>
          </li>
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
                <ChevronRight size={14} aria-hidden className="text-muted-foreground/60" />
                {isLast || !item.href ? (
                  <span aria-current={isLast ? "page" : undefined} className="font-medium text-foreground">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

export default Breadcrumbs;
