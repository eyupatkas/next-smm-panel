import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createReview, getServiceReviews, getServiceReviewStats } from "@/lib/reviews";
import { rateLimit, getClientIp as getRateLimitIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RATING_LIMITS = { minLen: 0, maxLen: 1000 };

function getClientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId")?.trim();
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId zorunlu" }, { status: 400 });
  }
  const take = Math.min(50, Math.max(1, Number(url.searchParams.get("take") ?? 20)));
  const skip = Math.max(0, Number(url.searchParams.get("skip") ?? 0));

  const [stats, reviews] = await Promise.all([
    getServiceReviewStats(serviceId),
    getServiceReviews(serviceId, { take, skip }),
  ]);

  return NextResponse.json({ stats, reviews });
}

export async function POST(req: Request) {
  const requestIp = getRateLimitIp(req);
  if (rateLimit(`review-create:${requestIp}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Çok fazla değerlendirme gönderdiniz." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
  const data = body as Record<string, unknown>;

  const serviceId = typeof data.serviceId === "string" ? data.serviceId.trim() : "";
  const rating = Number(data.rating);
  const title = typeof data.title === "string" ? data.title.slice(0, 120) : null;
  const comment = typeof data.comment === "string" ? data.comment.slice(0, RATING_LIMITS.maxLen) : null;
  const guestName =
    typeof data.guestName === "string" ? data.guestName.trim().slice(0, 60) : null;

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId zorunlu" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Puan 1-5 arası olmalı" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!userId && !guestName) {
    return NextResponse.json({ error: "İsim veya giriş gerekli" }, { status: 400 });
  }

  try {
    const review = await createReview({
      serviceId,
      userId,
      guestName,
      rating,
      title,
      comment,
      ip: getClientIp(req),
    });

    return NextResponse.json({
      ok: true,
      review: {
        id: review.id,
        approved: review.approved,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
