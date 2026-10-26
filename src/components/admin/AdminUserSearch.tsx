"use client";

import { useState, useTransition, useRef } from "react";
import { Search, Loader2, User, UserCheck, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchUsers, startImpersonation } from "@/lib/actions/impersonation-actions";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/useClickOutside";

type UserResult = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  balance: number;
};

export function AdminUserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, startSearch] = useTransition();
  const [impersonating, startImpersonate] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false));

  function handleChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    startSearch(async () => {
      const data = await searchUsers(value.trim());
      setResults(data as UserResult[]);
      setOpen(true);
    });
  }

  function handleImpersonate(userId: string) {
    setOpen(false);
    setQuery("");
    startImpersonate(() => startImpersonation(userId));
  }

  return (
    <div ref={containerRef} className="relative w-80 hidden md:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" size={16} />
      {(searching || impersonating) ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin z-10" size={14} />
      ) : null}
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Kullanıcı, servis veya sipariş ara..."
        className="pl-9 pr-8 glass border-white/5 bg-background shadow-inner text-foreground"
      />

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-white/[0.08] rounded-xl shadow-xl overflow-hidden z-50">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-white/[0.06]">
            Kullanıcılar — Paneline gir
          </p>
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.04] last:border-0"
              onClick={() => handleImpersonate(user.id)}
            >
              <div className={cn(
                "p-1.5 rounded-lg shrink-0",
                user.role === "RESELLER"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-blue-500/15 text-blue-400"
              )}>
                {user.role === "RESELLER" ? <UserCheck size={13} /> : <User size={13} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user.name || "İsimsiz"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground">{Number(user.balance).toFixed(2)} ₺</p>
                <p className={cn(
                  "text-[10px] font-semibold",
                  user.role === "RESELLER" ? "text-amber-400" : "text-blue-400"
                )}>{user.role}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/40 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.trim().length >= 2 && !searching && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-white/[0.08] rounded-xl shadow-xl p-4 text-sm text-muted-foreground text-center z-50">
          Kullanıcı bulunamadı
        </div>
      )}
    </div>
  );
}
