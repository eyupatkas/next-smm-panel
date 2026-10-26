import { ImageResponse } from "next/og";
import { findBlogPostMetaBySlug, getLocalizedMeta } from "@/lib/blog-posts";
import { defaultLocale } from "@/i18n/routing";

export const runtime = "nodejs";
export const alt = "OptiSMM Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#3b82f6";
const BG_FROM = "#0b1220";
const BG_TO = "#1e3a8a";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug, locale } = await params;
  const meta = await findBlogPostMetaBySlug(slug);
  const localized = meta && meta.title
    ? getLocalizedMeta(
        {
          title: meta.title,
          excerpt: meta.excerpt ?? null,
          translations: meta.translations ?? null,
        },
        locale,
      )
    : null;
  const title = localized?.title ?? "OptiSMM Blog";
  const excerpt =
    localized?.excerpt ??
    "SMM panel ipuçları, sosyal medya rehberleri, büyüme stratejileri.";
  const dateStr = meta?.publishedAt
    ? new Intl.DateTimeFormat(locale || defaultLocale, { dateStyle: "long" }).format(
        meta.publishedAt,
      )
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "70px 80px",
          background: `linear-gradient(135deg, ${BG_FROM} 0%, ${BG_TO} 100%)`,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#f8fafc",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            ↑
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>OptiSMM Blog</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: title.length > 60 ? 54 : 64,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1,
              maxWidth: 1040,
              display: "flex",
            }}
          >
            {title}
          </div>
          {excerpt && (
            <div
              style={{
                fontSize: 24,
                color: "#94a3b8",
                lineHeight: 1.4,
                maxWidth: 1040,
                display: "flex",
              }}
            >
              {excerpt.length > 160 ? excerpt.slice(0, 157) + "…" : excerpt}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          <div>optismm.com/blog</div>
          {dateStr && <div>{dateStr}</div>}
        </div>
      </div>
    ),
    { ...size },
  );
}
