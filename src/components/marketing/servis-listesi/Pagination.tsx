import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (p: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "dot")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("dot");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("dot");
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Sayfalama"
      className="flex flex-wrap items-center justify-center gap-2 pt-10"
    >
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          aria-label="Önceki sayfa"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={16} />
        </Link>
      )}
      {pages.map((p, i) =>
        p === "dot" ? (
          <span key={`dot-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p as number)}
            aria-label={`Sayfa ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-3 text-sm font-medium shadow-sm transition-colors ${
              p === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          aria-label="Sonraki sayfa"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowRight size={16} />
        </Link>
      )}
    </nav>
  );
}
