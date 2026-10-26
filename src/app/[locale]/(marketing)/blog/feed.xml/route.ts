import { buildBlogFeed } from "@/lib/blog-feed";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const xml = await buildBlogFeed(locale);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
