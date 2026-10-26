"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search, X } from "lucide-react";
import { PlatformIcon, getPlatformStyle } from "@/components/shared/PlatformIcon";

interface Platform {
  id: string;
  name: string;
  slug: string | null;
  subcatCount: number;
  pkgCount: number;
  hotCategories: { name: string; slug: string | null }[];
}

interface Props {
  platforms: Platform[];
}

export default function ServicesSearchClient({ platforms }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return platforms;
    return platforms.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.slug ?? "").toLowerCase().includes(q) ||
        p.hotCategories.some((c) => c.name.toLowerCase().includes(q)),
    );
  }, [platforms, query]);

  return (
    <section className="pb-20">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col items-center gap-4">
          <h2 className="text-center text-2xl font-bold">Platformunuzu Seçin</h2>

          {/* Arama kutusu */}
          <div className="relative w-full max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Platform ara… (Instagram, TikTok, YouTube…)"
              className="pl-10 pr-10 h-11 text-sm rounded-xl border-white/10 bg-white/[0.03] focus:border-primary/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Aramayı temizle"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Sonuç sayısı */}
          {query && (
            <p className="text-sm text-muted-foreground">
              {filtered.length === 0
                ? `"${query}" için sonuç bulunamadı`
                : `${filtered.length} platform bulundu`}
            </p>
          )}
        </div>

        {filtered.length === 0 && query ? (
          <div className="mx-auto max-w-sm rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <Search size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">&quot;{query}&quot; bulunamadı</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Farklı bir platform adı deneyin veya aramanızı temizleyin.
            </p>
            <button
              onClick={() => setQuery("")}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Aramanızı temizleyin
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((platform) => {
              const slug = platform.slug;
              const style = getPlatformStyle(slug);

              const card = (
                <div
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br ${style.gradient} p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/12 hover:shadow-xl cursor-pointer`}
                >
                  {/* Platform header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`rounded-2xl bg-background/50 p-3 ${style.color} ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110`}
                    >
                      <PlatformIcon slug={slug} name={platform.name} size={26} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{platform.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {platform.pkgCount} paket
                      </p>
                    </div>
                  </div>

                  {/* Hot categories */}
                  {platform.hotCategories.length > 0 && (
                    <div className="space-y-1.5 mb-5">
                      {platform.hotCategories.map((cat) => (
                        <div
                          key={cat.slug ?? cat.name}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <ChevronRight size={12} className="text-primary/50" />
                          {/* Highlight query in category name */}
                          {query && cat.name.toLowerCase().includes(query.toLowerCase()) ? (
                            <span>
                              {cat.name.split(new RegExp(`(${query})`, "gi")).map((part, i) =>
                                part.toLowerCase() === query.toLowerCase() ? (
                                  <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">
                                    {part}
                                  </mark>
                                ) : (
                                  part
                                ),
                              )}
                            </span>
                          ) : (
                            cat.name
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-1 text-xs font-semibold ${style.color} opacity-0 transition-opacity group-hover:opacity-100`}
                  >
                    Hizmetleri Gör <ChevronRight size={13} />
                  </div>
                </div>
              );

              if (slug) {
                return (
                  <Link key={platform.id} href={`/${slug}`}>
                    {card}
                  </Link>
                );
              }
              return <div key={platform.id}>{card}</div>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}
