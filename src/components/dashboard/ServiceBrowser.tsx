"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";
import { createOrder } from "@/lib/actions/order-actions";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  Play,
  Music2,
  MessageCircle,
  Globe,
  Zap,
  ShoppingCart,
  Loader2,
} from "lucide-react";

type PackageItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  serviceId: string;
  serviceName: string;
  serviceMin: number;
  serviceMax: number;
};

type Subcategory = {
  id: string;
  name: string;
  packages: PackageItem[];
};

type CategoryData = {
  id: string;
  name: string;
  icon: string | null;
  subcategories: Subcategory[];
};

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Heart size={28} />,
  youtube: <Play size={28} />,
  tiktok: <Music2 size={28} />,
  twitter: <MessageCircle size={28} />,
  telegram: <MessageCircle size={28} />,
  facebook: <Globe size={28} />,
};

function getPlatformIcon(name: string, icon: string | null) {
  const key = (icon || name).toLowerCase();
  for (const [k, v] of Object.entries(platformIcons)) {
    if (key.includes(k)) return v;
  }
  return <Zap size={28} />;
}

const platformColors: Record<string, string> = {
  instagram: "from-pink-500/20 to-purple-500/20 border-pink-500/30",
  youtube: "from-red-500/20 to-red-700/20 border-red-500/30",
  tiktok: "from-cyan-500/20 to-slate-500/20 border-cyan-500/30",
  twitter: "from-sky-500/20 to-blue-500/20 border-sky-500/30",
  telegram: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  facebook: "from-blue-600/20 to-indigo-500/20 border-blue-600/30",
};

function getPlatformColor(name: string) {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(platformColors)) {
    if (key.includes(k)) return v;
  }
  return "from-primary/10 to-primary/5 border-primary/20";
}

export function ServiceBrowser({ categories }: { categories: CategoryData[] }) {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState<CategoryData | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subcategory | null>(null);
  const [orderingPkg, setOrderingPkg] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const { format } = useCurrency();

  // ── Step 1: Platform Selection ──
  if (!selectedPlatform) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.length === 0 && (
          <p className="text-muted-foreground col-span-full">
            Goruntulenecek hizmet bulunmuyor. Admin henuz paket eklememis olabilir.
          </p>
        )}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedPlatform(cat)}
            className={`group rounded-2xl border bg-gradient-to-br p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl ${getPlatformColor(cat.name)}`}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white/10 p-3">
                {getPlatformIcon(cat.name, cat.icon)}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {cat.subcategories.length} kategori ·{" "}
                  {cat.subcategories.reduce((s, sub) => s + sub.packages.length, 0)} paket
                </p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ── Step 2: Subcategory Selection ──
  if (!selectedSub) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedPlatform(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Platformlara don
        </button>

        <div className={`rounded-2xl border bg-gradient-to-r p-5 ${getPlatformColor(selectedPlatform.name)}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-3">
              {getPlatformIcon(selectedPlatform.name, selectedPlatform.icon)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{selectedPlatform.name}</h2>
              <p className="text-sm text-muted-foreground">Bir kategori secin</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selectedPlatform.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSub(sub)}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:bg-white/10 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{sub.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub.packages.length} paket mevcut</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 3: Package Cards ──
  async function handleOrder(pkg: PackageItem) {
    if (!link.trim()) {
      toast.error("Lutfen gecerli bir link girin.");
      return;
    }
    setOrderingPkg(pkg.id);
    try {
      const formData = new FormData();
      formData.set("serviceId", pkg.serviceId);
      formData.set("link", link.trim());
      formData.set("quantity", String(pkg.quantity));
      const result = await createOrder({}, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result?.success || "Siparis olusturuldu!");
        router.push("/dashboard/orders");
      }
    } catch {
      toast.error("Siparis olusturulurken hata olustu.");
    } finally {
      setOrderingPkg(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => { setSelectedPlatform(null); setSelectedSub(null); setLink(""); }}
          className="hover:text-foreground transition-colors"
        >
          Platformlar
        </button>
        <ChevronRight size={14} />
        <button
          onClick={() => { setSelectedSub(null); setLink(""); }}
          className="hover:text-foreground transition-colors"
        >
          {selectedPlatform.name}
        </button>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{selectedSub.name}</span>
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="p-5">
          <label className="text-sm font-medium">Hesap / Gonderi Linki</label>
          <div className="mt-2 flex gap-3">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://instagram.com/kullaniciadi"
              className="flex h-11 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Islem yapilacak hesap veya gonderi linkini girin, ardindan paket secin.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {selectedSub.packages.map((pkg) => {
          const isOrdering = orderingPkg === pkg.id;
          return (
            <Card
              key={pkg.id}
              className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-xl transition-all hover:shadow-2xl hover:scale-[1.01]"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <FavoriteToggleButton serviceId={pkg.serviceId} className="h-8 w-8 shrink-0 rounded-lg" />
                </div>
                {pkg.description && (
                  <p className="text-xs text-muted-foreground">{pkg.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-primary">{format(pkg.price)}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {pkg.quantity.toLocaleString("tr-TR")} adet
                  </Badge>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between"><span>Servis</span><span className="text-foreground">{pkg.serviceName}</span></div>
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={isOrdering || !link.trim()}
                  onClick={() => handleOrder(pkg)}
                >
                  {isOrdering ? (
                    <><Loader2 className="animate-spin" size={16} /> Isleniyor...</>
                  ) : (
                    <><ShoppingCart size={16} /> Satin Al</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
