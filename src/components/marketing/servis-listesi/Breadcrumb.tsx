import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
    >
      {items.map((item, idx) => {
        const last = idx === items.length - 1;
        const node = item.href && !last ? (
          <Link
            href={item.href}
            className="transition-colors hover:text-foreground"
          >
            {item.label}
          </Link>
        ) : (
          <span
            className={`max-w-[260px] truncate ${last ? "font-medium text-foreground" : ""}`}
            aria-current={last ? "page" : undefined}
          >
            {item.label}
          </span>
        );
        return (
          <span key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight size={14} className="opacity-40" />}
            {node}
          </span>
        );
      })}
    </nav>
  );
}
