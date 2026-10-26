"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const modes = [
  { value: "light", label: "Açık tema", icon: Sun },
  { value: "dark", label: "Koyu tema", icon: Moon },
  { value: "system", label: "Sistem teması", icon: Monitor },
] as const;

function subscribe() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon" : "sm"}
        className={cn("border-border bg-background/70", className)}
        aria-label="Tema yükleniyor"
        disabled
      >
        <Sun size={16} />
      </Button>
    );
  }

  if (compact) {
    const currentIndex = modes.findIndex((mode) => mode.value === theme);
    const current = modes[currentIndex >= 0 ? currentIndex : 2];
    const Icon = current.icon;
    const next = modes[(currentIndex + 1) % modes.length] ?? modes[0];

    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("border-border bg-background/70", className)}
        onClick={() => setTheme(next.value)}
        aria-label={`${current.label}; geçilecek: ${next.label}`}
        title={`${current.label} -> ${next.label}`}
      >
        <Icon size={16} />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-background/70 p-0.5 shadow-sm",
        className,
      )}
      role="group"
      aria-label="Tema seçimi"
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const active = theme === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => setTheme(mode.value)}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground",
            )}
            aria-pressed={active}
            aria-label={mode.label}
            title={mode.label}
          >
            <Icon size={15} />
            <span className="sr-only">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}