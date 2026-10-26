"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { PublicReview, ReviewStats } from "@/lib/reviews";

type Props = {
  serviceId: string;
  serviceName: string;
  initialStats: ReviewStats;
  initialReviews: SerializedReview[];
  isLoggedIn: boolean;
};

export type SerializedReview = Omit<PublicReview, "createdAt"> & {
  createdAt: string; // ISO
};

const dateFmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

export function ServiceReviews({
  serviceId,
  serviceName,
  initialStats,
  initialReviews,
  isLoggedIn,
}: Props) {
  const [stats, setStats] = useState(initialStats);
  const [reviews, setReviews] = useState(initialReviews);
  const [open, setOpen] = useState(false);

  return (
    <section
      id="reviews"
      aria-label="Kullanıcı değerlendirmeleri"
      className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Kullanıcı Değerlendirmeleri
          </h2>
          <p className="text-xs text-muted-foreground">
            {serviceName} için doğrulanmış müşteri yorumları.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          {open ? "Vazgeç" : "Yorum Yaz"}
        </button>
      </div>

      <RatingSummary stats={stats} />

      {open && (
        <ReviewForm
          serviceId={serviceId}
          isLoggedIn={isLoggedIn}
          onSuccess={(newReview, newStats) => {
            setOpen(false);
            if (newStats) setStats(newStats);
            if (newReview) setReviews((r) => [newReview, ...r]);
          }}
        />
      )}

      <ul className="mt-6 space-y-4">
        {reviews.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Henüz değerlendirme yapılmadı. İlk yorumu sen yaz!
          </li>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </ul>
    </section>
  );
}

function RatingSummary({ stats }: { stats: ReviewStats }) {
  const total = stats.count;
  const avg = stats.average;

  return (
    <div className="mt-5 grid gap-5 md:grid-cols-[auto_1fr] md:gap-8">
      <div className="text-center">
        <div className="text-4xl font-extrabold text-foreground">
          {total > 0 ? avg.toFixed(1) : "—"}
        </div>
        <div className="mt-1 flex justify-center text-amber-500">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={14}
              fill={total > 0 && s <= Math.round(avg) ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          ))}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {total.toLocaleString("tr-TR")} değerlendirme
        </div>
      </div>
      <div className="space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((s) => {
          const c = stats.distribution[s];
          const pct = total > 0 ? (c / total) * 100 : 0;
          return (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted-foreground">{s}</span>
              <Star size={10} className="text-amber-500" fill="currentColor" strokeWidth={0} />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-muted-foreground">{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: SerializedReview }) {
  return (
    <li className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {review.authorName}
            </span>
            <span className="flex text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={12}
                  fill={s <= review.rating ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              ))}
            </span>
          </div>
          {review.title && (
            <p className="mt-1 text-sm font-semibold text-foreground">
              {review.title}
            </p>
          )}
        </div>
        <time className="text-[11px] text-muted-foreground" dateTime={review.createdAt}>
          {dateFmt.format(new Date(review.createdAt))}
        </time>
      </div>
      {review.comment && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {review.comment}
        </p>
      )}
    </li>
  );
}

function ReviewForm({
  serviceId,
  isLoggedIn,
  onSuccess,
}: {
  serviceId: string;
  isLoggedIn: boolean;
  onSuccess: (review: SerializedReview | null, stats: ReviewStats | null) => void;
}) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
          guestName: !isLoggedIn ? guestName.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gönderilemedi");

      if (data.review?.approved) {
        // refetch stats + first page
        const fresh = await fetch(`/api/reviews?serviceId=${serviceId}&take=20`);
        const freshData = await fresh.json();
        const newReview = freshData.reviews[0]
          ? { ...freshData.reviews[0], createdAt: freshData.reviews[0].createdAt }
          : null;
        onSuccess(newReview, freshData.stats);
        setThanks("Yorumun yayınlandı, teşekkürler!");
      } else {
        setThanks("Yorumun moderasyon sırasında — incelendikten sonra yayınlanacak.");
        onSuccess(null, null);
      }
      setTitle("");
      setComment("");
      setGuestName("");
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setSubmitting(false);
    }
  }

  if (thanks) {
    return (
      <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
        {thanks}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 space-y-3 rounded-xl border border-border bg-background p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">
          Puanın
        </label>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHover(s)}
              className="text-amber-500 transition-transform hover:scale-110"
              aria-label={`${s} yıldız`}
            >
              <Star
                size={24}
                fill={(hover || rating) >= s ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
      </div>
      {!isLoggedIn && (
        <div>
          <label htmlFor="rev-name" className="mb-1 block text-xs font-semibold text-foreground">
            Adın *
          </label>
          <input
            id="rev-name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
            maxLength={60}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      )}
      <div>
        <label htmlFor="rev-title" className="mb-1 block text-xs font-semibold text-foreground">
          Başlık (opsiyonel)
        </label>
        <input
          id="rev-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="rev-comment" className="mb-1 block text-xs font-semibold text-foreground">
          Yorumun
        </label>
        <textarea
          id="rev-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "Gönderiliyor…" : "Yorumu Gönder"}
      </button>
    </form>
  );
}
