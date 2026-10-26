import { useEffect, useRef } from "react";

export function useAbandonedTracker(pageType: "ORDER" | "FUNDS", formData: Record<string, any>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    // Boş veya anlamsız verileri izleme
    const hasData = Object.values(formData).some(
      (val) => val !== null && val !== undefined && val !== "" && val !== false
    );

    if (!hasData) return;

    // Aynı veri için ardışık istekleri engelle
    const currentDataStr = JSON.stringify(formData);
    if (prevDataRef.current === currentDataStr) return;

    // Debounce: Formun son halini kaydetmek için 3 saniye bekle
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      prevDataRef.current = currentDataStr;
      fetch("/api/dashboard/recovery/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType, formData }),
      }).catch((err) => console.error("[abandoned-tracker] Failed to log:", err));
    }, 3000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [formData, pageType]);
}
