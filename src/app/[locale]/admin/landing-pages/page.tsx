"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type LandingPage = {
  id: string;
  slug: string;
  platform: string | null;
  seoTitle: string | null;
  published: boolean;
};

export default function AdminLandingPages() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/admin/landing-pages");
      if (!res.ok) throw new Error("Sayfalar alınamadı");
      const data = await res.json();
      setPages(data);
    } catch (error) {
      console.error(error);
      toast.error("Sayfalar yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, slug: string) => {
    if (!window.confirm(`'${slug}' sayfasını silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/admin/landing-pages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silinemedi");
      toast.success("Sayfa silindi");
      fetchPages();
    } catch (error) {
      console.error(error);
      toast.error("Hata oluştu");
    }
  };

  const filteredPages = pages.filter((p) =>
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Landing Sayfaları</h1>
          <p className="text-muted-foreground mt-1">
            SEO ve SSS odaklı marketing sayfalarını (örn: instagram-takipci-satin-al) yönetin.
          </p>
        </div>
        <Link href="/admin/landing-pages/new">
          <Button className="gap-2 bg-primary">
            <Plus size={16} /> Yeni Sayfa Ekle
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Slug ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="border-b">
                  <th className="h-10 px-4 text-left font-medium">URL (Slug)</th>
                  <th className="h-10 px-4 text-left font-medium">Platform</th>
                  <th className="h-10 px-4 text-left font-medium">SEO Title</th>
                  <th className="h-10 px-4 text-left font-medium">Durum</th>
                  <th className="h-10 px-4 text-right font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      Sayfa bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((page) => (
                    <tr key={page.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">/{page.slug}</td>
                      <td className="p-4">{page.platform || "-"}</td>
                      <td className="p-4 max-w-[200px] truncate" title={page.seoTitle || ""}>
                        {page.seoTitle || <span className="text-muted-foreground italic">Yok</span>}
                      </td>
                      <td className="p-4">
                        {page.published ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            title="Görüntüle"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <Link href={`/admin/landing-pages/${page.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <Edit2 size={16} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(page.id, page.slug)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
