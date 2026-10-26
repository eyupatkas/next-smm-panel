"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, type Currency } from "@/lib/currency";
import { Heart, Search, Trash2, User2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AdminFavoriteRow = {
  id: string;
  createdAt: string;
  guestToken: string | null;
  serviceId: string;
  serviceName: string;
  serviceUrl: string;
  platformName: string;
  categoryName: string;
  price: number;
  actorLabel: string;
  actorType: "guest" | "member";
};

type Props = {
  favorites: AdminFavoriteRow[];
  currency: Currency;
  intlLocale: string;
  stats: {
    total: number;
    guests: number;
    members: number;
    uniqueServices: number;
  };
};

export function AdminFavoritesClient({ favorites, currency, intlLocale, stats }: Props) {
  const [items, setItems] = useState(favorites);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return items;
    }

    return items.filter((item) =>
      [item.serviceName, item.actorLabel, item.platformName, item.categoryName]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [items, query]);

  async function removeFavorite(favoriteId: string) {
    setDeletingId(favoriteId);

    try {
      const response = await fetch(`/api/admin/favorites/${favoriteId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Favori silinemedi.");
      }

      setItems((current) => current.filter((item) => item.id !== favoriteId));
      toast.success("Favori kaydi silindi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Favori silinemedi.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Toplam kayit", value: stats.total.toLocaleString("tr-TR") },
          { label: "Uye favorileri", value: stats.members.toLocaleString("tr-TR") },
          { label: "Misafir favorileri", value: stats.guests.toLocaleString("tr-TR") },
          { label: "Esiz servis", value: stats.uniqueServices.toLocaleString("tr-TR") },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Favori Servisler</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Misafir ve uye favorilerini tek ekrandan izleyin ve temizleyin.
            </p>
          </div>
          <label className="relative w-full md:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Servis, platform veya kullanici ara..."
              className="pl-9"
            />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3">Servis</th>
                <th className="px-3 py-3">Aktor</th>
                <th className="px-3 py-3">Kategori</th>
                <th className="px-3 py-3 text-right">Fiyat</th>
                <th className="px-3 py-3">Tarih</th>
                <th className="px-3 py-3 text-right">Islem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border/70 align-top">
                  <td className="px-3 py-4">
                    <div className="space-y-1">
                      <Link href={item.serviceUrl} className="font-semibold text-foreground hover:text-primary">
                        {item.serviceName}
                      </Link>
                      <p className="text-xs text-muted-foreground">#{item.serviceId.slice(-8).toUpperCase()}</p>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                      <User2 size={12} />
                      {item.actorLabel}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-muted-foreground">
                    {item.platformName} / {item.categoryName}
                  </td>
                  <td className="px-3 py-4 text-right font-semibold text-foreground">
                    {formatPrice(item.price, currency, intlLocale)}
                  </td>
                  <td className="px-3 py-4 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void removeFavorite(item.id)}
                      disabled={deletingId === item.id}
                    >
                      <Trash2 size={14} className="mr-2" />
                      Sil
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <Heart size={22} />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Kayit bulunamadi</p>
                <p className="text-sm text-muted-foreground">Arama filtresini degistirip tekrar deneyin.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}