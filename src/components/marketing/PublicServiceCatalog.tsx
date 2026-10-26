"use client";

import { useState } from "react";
import { PackageShowcase } from "@/components/marketing/PackageShowcase";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Globe,
  Heart,
  MessageCircle,
  Music2,
  Play,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

/* ---------- Types ---------- */
type PublicPackage = {
  id: string;
  serviceId?: string | null;
  name: string;
  quantity: number;
  retailPrice: number | null;
  price: number;
  description: string | null;
};

type PublicSubcategory = {
  id: string;
  name: string;
  packages: PublicPackage[];
};

type PublicCategory = {
  id: string;
  name: string;
  children: PublicSubcategory[];
};

/* ---------- Helpers ---------- */

const platformMeta: Record<string, { icon: React.ReactNode; gradient: string; color: string }> = {
  instagram: {
    icon: <Heart size={28} />,
    gradient: "from-pink-500/20 via-purple-500/20 to-orange-500/20",
    color: "text-pink-400",
  },
  youtube: {
    icon: <Play size={28} />,
    gradient: "from-red-500/20 to-red-600/20",
    color: "text-red-400",
  },
  tiktok: {
    icon: <Music2 size={28} />,
    gradient: "from-cyan-400/20 via-pink-500/20 to-cyan-400/20",
    color: "text-cyan-400",
  },
  twitter: {
    icon: <MessageCircle size={28} />,
    gradient: "from-sky-400/20 to-blue-500/20",
    color: "text-sky-400",
  },
  facebook: {
    icon: <Globe size={28} />,
    gradient: "from-blue-600/20 to-blue-400/20",
    color: "text-blue-400",
  },
  telegram: {
    icon: <MessageCircle size={28} />,
    gradient: "from-sky-400/20 to-cyan-400/20",
    color: "text-sky-400",
  },
  spotify: {
    icon: <Music2 size={28} />,
    gradient: "from-green-500/20 to-green-400/20",
    color: "text-green-400",
  },
  twitch: {
    icon: <Play size={28} />,
    gradient: "from-purple-500/20 to-violet-500/20",
    color: "text-purple-400",
  },
  linkedin: {
    icon: <Users size={28} />,
    gradient: "from-blue-700/20 to-blue-500/20",
    color: "text-blue-400",
  },
  discord: {
    icon: <MessageCircle size={28} />,
    gradient: "from-indigo-500/20 to-violet-500/20",
    color: "text-indigo-400",
  },
};

function getPlatformMeta(name: string) {
  const key = name.toLowerCase();
  for (const [label, meta] of Object.entries(platformMeta)) {
    if (key.includes(label)) return meta;
  }
  return {
    icon: <Zap size={28} />,
    gradient: "from-primary/20 to-primary/10",
    color: "text-primary",
  };
}

function getSubcategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("takipci") || n.includes("abone") || n.includes("uye")) return <Users size={20} />;
  if (n.includes("begeni") || n.includes("like")) return <Heart size={20} />;
  if (n.includes("izlenme") || n.includes("view") || n.includes("gorunt")) return <TrendingUp size={20} />;
  if (n.includes("yorum") || n.includes("yanit")) return <MessageCircle size={20} />;
  if (n.includes("paylasim") || n.includes("retweet")) return <Rocket size={20} />;
  return <Sparkles size={20} />;
}

/* ---------- Component ---------- */

export function PublicServiceCatalog({ categories }: { categories: PublicCategory[] }) {
  const [selectedPlatform, setSelectedPlatform] = useState<PublicCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<PublicSubcategory | null>(null);

  /* ========== Step 1: Platform Seçimi ========== */
  if (!selectedPlatform) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Platformunuzu Seçin</h2>
          <p className="mt-2 text-muted-foreground">
            Büyütmek istediğiniz sosyal medya platformunu seçerek başlayın
          </p>
        </div>

        {categories.length === 0 && (
          <p className="text-center text-muted-foreground">
            Şu anda gösterilecek hizmet bulunmuyor. Lütfen daha sonra tekrar deneyin.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {categories.map((category) => {
            const meta = getPlatformMeta(category.name);
            const totalPkgs = category.children.reduce((s, c) => s + c.packages.length, 0);

            return (
              <button
                key={category.id}
                onClick={() => setSelectedPlatform(category)}
                className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br ${meta.gradient} p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-xl hover:shadow-primary/5`}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={`rounded-2xl bg-background/50 p-3.5 ${meta.color} ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110`}>
                    {meta.icon}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{category.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {totalPkgs} paket hazır
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Hizmetleri Gör <ChevronRight size={14} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ========== Step 2: Hizmet Türü Seçimi ========== */
  if (!selectedSubcategory) {
    const meta = getPlatformMeta(selectedPlatform.name);

    return (
      <div className="space-y-8">
        <button
          onClick={() => setSelectedPlatform(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} /> Tüm Platformlar
        </button>

        <div className={`overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-r ${meta.gradient} p-8`}>
          <div className="flex items-center gap-4">
            <div className={`rounded-2xl bg-background/50 p-4 ${meta.color} ring-1 ring-white/10`}>
              {meta.icon}
            </div>
            <div>
              <h2 className="text-3xl font-bold">{selectedPlatform.name}</h2>
              <p className="mt-1 text-muted-foreground">
                Ne tür bir hizmet almak istiyorsunuz? Aşağıdan seçim yapın.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selectedPlatform.children.map((subcategory) => {
            const icon = getSubcategoryIcon(subcategory.name);
            const hasPkgs = subcategory.packages.length > 0;

            return (
              <button
                key={subcategory.id}
                onClick={() => setSelectedSubcategory(subcategory)}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-all duration-200 hover:border-primary/20 hover:bg-primary/[0.03] hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary/20">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{subcategory.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {hasPkgs
                        ? `${subcategory.packages.length} farklı paket seçeneği`
                        : "Yakında eklenecek"}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 text-muted-foreground/50 transition-colors group-hover:text-primary" size={18} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ========== Step 3: Paketler & Sipariş ========== */
  const meta = getPlatformMeta(selectedPlatform.name);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => { setSelectedPlatform(null); setSelectedSubcategory(null); }}
          className="transition-colors hover:text-foreground"
        >
          Tüm Platformlar
        </button>
        <ChevronRight size={14} className="text-muted-foreground/40" />
        <button onClick={() => setSelectedSubcategory(null)} className="transition-colors hover:text-foreground">
          {selectedPlatform.name}
        </button>
        <ChevronRight size={14} className="text-muted-foreground/40" />
        <span className="font-medium text-foreground">{selectedSubcategory.name}</span>
      </nav>

      {/* Platform+hizmet başlığı */}
      <div className={`overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-r ${meta.gradient} p-6 sm:p-8`}>
        <div className="flex items-start gap-4">
          <div className={`hidden rounded-xl bg-background/50 p-3 sm:block ${meta.color} ring-1 ring-white/10`}>
            {meta.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">
              {selectedPlatform.name} {selectedSubcategory.name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Aşağıdan size uygun paketi seçin. Hesap bilgilerinizi girin ve hemen başlayalım.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {["Güvenli ödeme", "Hızlı teslimat", "30 gün garanti"].map((item) => (
          <div key={item} className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold shadow-sm">
            <CheckCircle2 size={15} className="mr-2 inline text-emerald-500" />
            {item}
          </div>
        ))}
      </div>

      <PackageShowcase
        packages={selectedSubcategory.packages.map((pkg) => ({
          ...pkg,
          platformName: selectedPlatform.name,
          categoryName: selectedSubcategory.name,
        }))}
        platformName={selectedPlatform.name}
        categoryName={selectedSubcategory.name}
        emptyTitle="Bu hizmet yakında aktif olacak"
        emptyDescription="Paketler hazırlanıyor. Çok yakında burada listelenecek."
      />
    </div>
  );
}
