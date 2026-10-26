/**
 * SEO structured data helpers for the public service catalog.
 * All emit application/ld+json scripts using safe stringification.
 */

type Json = Record<string, unknown> | unknown[];

function JsonLdScript({ data }: { data: Json }) {
  // Sanitise </script> in user-controlled strings.
  const safe = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

export function BreadcrumbJsonLd({
  siteUrl,
  items,
}: {
  siteUrl: string;
  items: { name: string; href: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : `${siteUrl}${item.href}`,
    })),
  };
  return <JsonLdScript data={data} />;
}

export function ItemListJsonLd({
  siteUrl,
  items,
}: {
  siteUrl: string;
  items: { name: string; url: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.slice(0, 30).map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      url: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
    })),
  };
  return <JsonLdScript data={data} />;
}

export function ProductJsonLd({
  siteUrl,
  url,
  name,
  description,
  category,
  brand,
  price,
  currency,
  min,
  max,
  aggregateRating,
  reviews,
}: {
  siteUrl: string;
  url: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  min: number;
  max: number;
  aggregateRating?: { ratingValue: number; reviewCount: number } | null;
  reviews?: Array<{
    author: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    datePublished: string; // ISO
  }>;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    category,
    brand: { "@type": "Brand", name: brand },
    sku: `svc-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64),
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: price.toFixed(4),
      availability: "https://schema.org/InStock",
      url: url.startsWith("http") ? url : `${siteUrl}${url}`,
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        minValue: min,
        maxValue: max,
        unitText: "adet (per 1000 fiyat)",
      },
    },
  };

  if (aggregateRating && aggregateRating.reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue.toFixed(1),
      reviewCount: aggregateRating.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  if (reviews && reviews.length > 0) {
    data.review = reviews.slice(0, 10).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.datePublished,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      ...(r.title ? { name: r.title } : {}),
      ...(r.body ? { reviewBody: r.body } : {}),
    }));
  }

  return <JsonLdScript data={data} />;
}

export function FaqJsonLd({
  faqs,
}: {
  faqs: { q: string; a: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <JsonLdScript data={data} />;
}
