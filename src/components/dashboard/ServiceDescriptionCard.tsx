import { ScrollText, Info } from "lucide-react";
import { splitServiceDescription } from "@/lib/service-description";

type Props = {
  description: string | null | undefined;
  title?: string;
};

export function ServiceDescriptionCard({
  description,
  title = "Servis Açıklaması",
}: Props) {
  const { summary, bullets } = splitServiceDescription(description);

  if (!summary && bullets.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 space-y-3">
      {/* Başlık */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10">
          <ScrollText size={14} className="text-sky-600 dark:text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            {title}
          </h4>
        </div>
        <Info size={13} className="shrink-0 text-sky-500/50" />
      </div>

      {/* Özet metin */}
      {summary ? (
        <p className="text-sm leading-6 text-foreground/80">{summary}</p>
      ) : null}

      {/* Madde işaretleri */}
      {bullets.length > 0 ? (
        <ul className="space-y-1.5">
          {bullets.map((line) => (
            <li
              key={line}
              className="flex items-start gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500/60" />
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}