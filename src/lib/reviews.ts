import { db } from "@/lib/db";
import { createHash } from "node:crypto";

export type ReviewStats = {
  count: number;
  average: number; // 0 if no reviews
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

const EMPTY_DIST: ReviewStats["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/**
 * Belirli bir servis için onaylı yorumların istatistiklerini döner.
 * Önce Service üstündeki denormalize alanları okur (hızlı), sonra
 * tam dağılım için yorumları sayar.
 */
export async function getServiceReviewStats(serviceId: string): Promise<ReviewStats> {
  const grouped = await db.serviceReview.groupBy({
    by: ["rating"],
    where: { serviceId, approved: true },
    _count: { _all: true },
  });

  const distribution = { ...EMPTY_DIST };
  let total = 0;
  let sum = 0;
  for (const row of grouped) {
    const r = row.rating as 1 | 2 | 3 | 4 | 5;
    if (r >= 1 && r <= 5) {
      distribution[r] = row._count._all;
      total += row._count._all;
      sum += r * row._count._all;
    }
  }
  return {
    count: total,
    average: total > 0 ? Number((sum / total).toFixed(2)) : 0,
    distribution,
  };
}

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  authorName: string;
  createdAt: Date;
};

export async function getServiceReviews(
  serviceId: string,
  { take = 20, skip = 0 }: { take?: number; skip?: number } = {},
): Promise<PublicReview[]> {
  const rows = await db.serviceReview.findMany({
    where: { serviceId, approved: true },
    orderBy: [{ createdAt: "desc" }],
    take,
    skip,
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      guestName: true,
      createdAt: true,
      user: { select: { name: true, username: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    createdAt: r.createdAt,
    authorName: r.user?.name ?? r.user?.username ?? r.guestName ?? "Anonim",
  }));
}

const ipHash = (ip: string | null) =>
  ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;

export type CreateReviewInput = {
  serviceId: string;
  userId?: string | null;
  guestName?: string | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  ip?: string | null;
};

export async function createReview(input: CreateReviewInput) {
  if (input.rating < 1 || input.rating > 5 || !Number.isInteger(input.rating)) {
    throw new Error("rating 1-5 arası tam sayı olmalı");
  }
  if (!input.userId && !input.guestName) {
    throw new Error("Misafir yorumu için isim gerekli");
  }
  const service = await db.service.findUnique({
    where: { id: input.serviceId },
    select: { id: true },
  });
  if (!service) throw new Error("Servis bulunamadı");

  const review = await db.serviceReview.create({
    data: {
      serviceId: input.serviceId,
      userId: input.userId ?? null,
      guestName: input.guestName ?? null,
      rating: input.rating,
      title: input.title?.trim() || null,
      comment: input.comment?.trim() || null,
      ipHash: ipHash(input.ip ?? null),
      // Misafir yorumları moderasyona tabi, kullanıcı yorumları otomatik onaylı
      approved: Boolean(input.userId),
    },
  });

  if (review.approved) {
    await refreshServiceRatingDenormalized(input.serviceId);
  }

  return review;
}

/**
 * Service tablosundaki ratingAvg / ratingCount alanlarını günceller.
 * Listeleme sayfalarında JOIN/aggregate yapmadan AggregateRating göstermek için.
 */
export async function refreshServiceRatingDenormalized(serviceId: string) {
  const stats = await getServiceReviewStats(serviceId);
  await db.service.update({
    where: { id: serviceId },
    data: {
      ratingAvg: stats.count > 0 ? stats.average : null,
      ratingCount: stats.count,
    },
  });
}
