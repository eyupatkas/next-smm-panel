"use client";

import { useFavorites } from "@/context/FavoritesContext";
import { cn } from "@/lib/utils";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

type FavoriteToggleButtonProps = {
  serviceId: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
  stopPropagation?: boolean;
};

export function FavoriteToggleButton({
  serviceId,
  className,
  iconClassName,
  labelClassName,
  showLabel = false,
  stopPropagation = false,
}: FavoriteToggleButtonProps) {
  const { isFavorite, isPending, toggleFavorite } = useFavorites();

  const active = isFavorite(serviceId);
  const pending = isPending(serviceId);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.stopPropagation();
    }

    try {
      const favorited = await toggleFavorite(serviceId);
      toast.success(
        favorited ? "Favorilere eklendi." : "Favorilerden kaldirildi.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Favori islemi tamamlanamadi.",
      );
    }
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Favorilerden kaldir" : "Favorilere ekle"}
      onClick={(event) => void handleClick(event)}
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70",
        active && "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        showLabel ? "h-10 px-4" : "h-9 w-9",
        className,
      )}
    >
      {pending ? (
        <Loader2 size={14} className={cn("animate-spin", iconClassName)} />
      ) : (
        <Heart
          size={14}
          className={iconClassName}
          fill={active ? "currentColor" : "none"}
        />
      )}
      {showLabel ? (
        <span className={cn("text-xs font-semibold", labelClassName)}>
          {active ? "Favorilerde" : "Favoriye Al"}
        </span>
      ) : null}
    </button>
  );
}