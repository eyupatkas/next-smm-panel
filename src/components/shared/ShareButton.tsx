"use client";

import { cn } from "@/lib/utils";
import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ShareButtonProps = {
  title: string;
  url: string;
  className?: string;
  showLabel?: boolean;
};

export function ShareButton({
  title,
  url,
  className,
  showLabel = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      const shareUrl = url.startsWith("http")
        ? url
        : new URL(url, window.location.origin).toString();

      if (navigator.share) {
        await navigator.share({
          title,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Baglanti kopyalandi.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Paylasim baslatilamadi.");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-label="Paylas"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        showLabel ? "h-10 px-4" : "h-9 w-9",
        className,
      )}
    >
      {copied ? (
        <Check size={14} />
      ) : showLabel ? (
        <Share2 size={14} />
      ) : (
        <Copy size={14} />
      )}
      {showLabel ? (
        <span className="text-xs font-semibold">
          {copied ? "Kopyalandi" : "Paylas"}
        </span>
      ) : null}
    </button>
  );
}