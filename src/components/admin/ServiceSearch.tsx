"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";

export type ServiceOption = { id: string; name: string; categoryName: string };

export function ServiceSearch({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: ServiceOption | null;
}) {
  const [query, setQuery] = useState(defaultValue?.name ?? "");
  const [results, setResults] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ServiceOption | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected || query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/services/search?q=${encodeURIComponent(query)}`);
        const data: ServiceOption[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, selected]);

  function pick(s: ServiceOption) {
    setSelected(s);
    setQuery(s.name);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selected) setSelected(null);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Servis adı ile ara (min. 2 karakter)"
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoComplete="off"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {selected && !loading && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected && (
        <p className="mt-1 truncate text-xs text-emerald-400">
          [{selected.categoryName}] {selected.name}
        </p>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-popover shadow-2xl">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => pick(s)}
              className="flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
            >
              <span className="truncate font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.categoryName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
