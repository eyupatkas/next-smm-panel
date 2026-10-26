import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  centered?: boolean;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
};

const sizes = {
  sm: {
    icon: 32,
    gap: "gap-2.5",
    tagline: "text-[10px]",
  },
  md: {
    icon: 44,
    gap: "gap-3",
    tagline: "text-[11px]",
  },
  lg: {
    icon: 56,
    gap: "gap-3.5",
    tagline: "text-xs",
  },
} as const;

// "Yükseliş O" markası: halka + kuzeydoğuya kırılan ok (OptiSMM logosu)
function OptiSMMMark({ size, gradientId }: { size: number; gradientId: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-3 -3 206 206"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <path
        d="M151.2 86.1 A58 58 0 1 0 129.3 151.5"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M151.2 86.1 L191.2 46.1"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M164.2 49.1 L191.2 46.1 L188.2 73.1"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Fonttan bağımsız, elle çizilmiş monoline "OptiSMM" wordmark'ı.
// "Opti" → currentColor (tema uyumlu), "SMM" → marka gradyanı.
function OptiSMMWordmark({ height, gradientId }: { height: number; gradientId: string }) {
  const width = Math.round((height * 417) / 124);
  return (
    <svg
      width={width}
      height={height}
      viewBox="-4 12 417 124"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`${gradientId}-wm`} gradientUnits="userSpaceOnUse" x1="210" y1="0" x2="411" y2="0">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="29" cy="60" rx="25.5" ry="39.5" />
        <path d="M73 56 V124" />
        <circle cx="95.5" cy="79" r="20" />
        <path d="M133 48 H157" />
        <path d="M145 26 V86 Q145 100 155 100 H160" />
        <path d="M184 58 V100" />
        <circle cx="184" cy="34.5" r="6.5" fill="currentColor" stroke="none" />
      </g>
      <g
        fill="none"
        stroke={`url(#${gradientId}-wm)`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M253 34 C250 25 242.5 20 233 20 C221.5 20 214 27.5 214 37.5 C214 48 222 52.5 236 56.5 C250 60.5 258 66 258 77 C258 89.5 248 97 234 97 C220.5 97 213 90 211.5 79.5" />
        <path d="M279 100 V22 L305 63 L331 22 V100" />
        <path d="M354 100 V22 L380 63 L406 22 V100" />
      </g>
    </svg>
  );
}

export function BrandMark({ className, centered = false, size = "md", showTagline = false }: Props) {
  const currentSize = sizes[size];
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradientId = `osmm-${rawId}`;

  return (
    <div className={cn("inline-flex items-center", currentSize.gap, centered && "justify-center text-center", className)}>
      <OptiSMMMark size={currentSize.icon} gradientId={gradientId} />
      <div className={cn("leading-none", centered && "flex flex-col items-center")}>
        <span className="text-foreground" style={{ display: "block" }}>
          <OptiSMMWordmark height={Math.round(currentSize.icon * 0.83)} gradientId={gradientId} />
        </span>
        {showTagline ? (
          <span className={cn("mt-1 block uppercase tracking-[0.24em] text-primary/70", currentSize.tagline)}>
            Sosyal Medya Paneli
          </span>
        ) : null}
      </div>
    </div>
  );
}
