"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type FaqItem = {
  q: string;
  a: string;
};

const SUPPORTED_LANGS = [
  { code: "tr", name: "Türkçe (Varsayılan)" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "ar", name: "العربية" },
];

export default function LandingPageEdit() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    slug: "",
    platform: "",
    seoTitle: "",
    seoDescription: "",
    h1: "",
    heroDescription: "",
    content: "",
    published: true,
  });

  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [currentLang, setCurrentLang] = useState("tr");

  useEffect(() => {
    if (isNew) return;
    
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/admin/landing-pages/${id}`);
        if (!res.ok) {
          toast.error("Sayfa bulunamadı");
          router.push("/admin/landing-pages");
          return;
        }
        const data = await res.json();
        setFormData({
          slug: data.slug || "",
          platform: data.platform || "",
          seoTitle: data.seoTitle || "",
          seoDescription: data.seoDescription || "",
          h1: data.h1 || "",
          heroDescription: data.heroDescription || "",
          content: data.content || "",
          published: data.published,
        });
        setFaqItems(Array.isArray(data.faqItems) ? data.faqItems : []);
        setTranslations(data.translations || {});
      } catch (error) {
        console.error(error);
        toast.error("Hata oluştu");
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [id, isNew, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (currentLang === "tr") {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    } else {
      const langData = translations[currentLang] || {};
      setTranslations({
        ...translations,
        [currentLang]: { ...langData, [e.target.name]: e.target.value },
      });
    }
  };

  const getValue = (key: string) => {
    if (currentLang === "tr") return formData[key as keyof typeof formData] as string;
    return translations[currentLang]?.[key] || "";
  };

  const getFaqItems = (): FaqItem[] => {
    if (currentLang === "tr") return faqItems;
    return translations[currentLang]?.faqItems || [];
  };

  const handleFaqChange = (index: number, field: keyof FaqItem, value: string) => {
    const currentFaqs = getFaqItems();
    const newFaqs = [...currentFaqs];
    newFaqs[index] = { ...newFaqs[index], [field]: value };
    
    if (currentLang === "tr") {
      setFaqItems(newFaqs);
    } else {
      setTranslations({
        ...translations,
        [currentLang]: { ...translations[currentLang], faqItems: newFaqs },
      });
    }
  };

  const addFaq = () => {
    const currentFaqs = getFaqItems();
    if (currentLang === "tr") {
      setFaqItems([...currentFaqs, { q: "", a: "" }]);
    } else {
      setTranslations({
        ...translations,
        [currentLang]: { ...translations[currentLang], faqItems: [...currentFaqs, { q: "", a: "" }] },
      });
    }
  };

  const removeFaq = (index: number) => {
    const currentFaqs = getFaqItems();
    const newFaqs = [...currentFaqs];
    newFaqs.splice(index, 1);
    if (currentLang === "tr") {
      setFaqItems(newFaqs);
    } else {
      setTranslations({
        ...translations,
        [currentLang]: { ...translations[currentLang], faqItems: newFaqs },
      });
    }
  };

  const handleSave = async () => {
    if (!formData.slug.trim()) {
      toast.error("Slug zorunludur.");
      return;
    }

    setSaving(true);
    const payload = {
      ...formData,
      faqItems,
      translations,
    };

    try {
      const url = isNew ? "/api/admin/landing-pages" : `/api/admin/landing-pages/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");

      toast.success("Sayfa başarıyla kaydedildi.");
      if (isNew) {
        router.push("/admin/landing-pages");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNew ? "Yeni Landing Sayfası" : "Sayfa Düzenle"}
            </h1>
            <p className="text-muted-foreground mt-1">SEO uyumlu dinamik sayfa oluşturun.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 mr-4">
            <Switch
              checked={formData.published}
              onCheckedChange={(val) => setFormData({ ...formData, published: val })}
              id="published-mode"
            />
            <Label htmlFor="published-mode">Aktif Yayınla</Label>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save size={16} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* Dil Seçici (SEO için) */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {SUPPORTED_LANGS.map((lang) => (
          <Button
            key={lang.code}
            variant={currentLang === lang.code ? "default" : "outline"}
            onClick={() => setCurrentLang(lang.code)}
            size="sm"
            className="min-w-[100px]"
          >
            {lang.name}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">Temel Ayarlar & URL</h2>
            <div className="space-y-2">
              <Label>URL Slug (ör: instagram-takipci-satin-al)</Label>
              <Input
                name="slug"
                placeholder="ornek-sayfa"
                value={formData.slug}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">URL adresini belirler. Önünde '/' olmadan yazın.</p>
            </div>
            <div className="space-y-2">
              <Label>Platform (İsteğe bağlı, ör: instagram)</Label>
              <Input
                name="platform"
                placeholder="instagram"
                value={formData.platform}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">Bu platformla ilgili blog yazılarını eşleştirmek için kullanılır.</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-lg">SEO Metaları</h2>
            <div className="space-y-2">
              <Label>SEO Title ({currentLang.toUpperCase()})</Label>
              <Input
                name="seoTitle"
                placeholder="Instagram Takipçi Satın Al | Güvenilir..."
                value={getValue("seoTitle")}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Description ({currentLang.toUpperCase()})</Label>
              <Textarea
                name="seoDescription"
                placeholder="Arama motorlarında görünecek açıklama..."
                value={getValue("seoDescription")}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
          
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-lg">Sayfa Üst (Hero) Alanı</h2>
            <div className="space-y-2">
              <Label>Ana Başlık (H1) ({currentLang.toUpperCase()})</Label>
              <Input
                name="h1"
                placeholder="Sayfanın en üstünde görünecek büyük başlık"
                value={getValue("h1")}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Hero Açıklaması ({currentLang.toUpperCase()})</Label>
              <Textarea
                name="heroDescription"
                placeholder="Başlığın altındaki karşılama yazısı..."
                value={getValue("heroDescription")}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-lg">Zengin Makale İçeriği (SEO)</h2>
            <div className="space-y-2">
              <Label>İçerik (HTML veya Düz Metin destekler) ({currentLang.toUpperCase()})</Label>
              <Textarea
                name="content"
                placeholder="<h2>Neden Bizi Seçmelisiniz?</h2><p>Hizmetlerimiz güvenilirdir...</p>"
                value={getValue("content")}
                onChange={handleChange}
                className="min-h-[250px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Sayfanın alt kısımlarında yer alacak kapsamlı SEO makalesi.</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Sık Sorulan Sorular (SSS)</h2>
              <Button variant="outline" size="sm" onClick={addFaq} className="gap-2">
                <Plus size={14} /> SSS Ekle
              </Button>
            </div>

            {getFaqItems().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                Henüz SSS eklenmemiş.
              </p>
            ) : (
              <div className="space-y-4">
                {getFaqItems().map((faq, index) => (
                  <div key={index} className="relative p-4 border rounded-lg bg-muted/20 space-y-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFaq(index)}
                    >
                      <Trash2 size={16} />
                    </Button>
                    <div className="space-y-1.5 pr-8">
                      <Label className="text-xs font-semibold">Soru {index + 1}</Label>
                      <Input
                        placeholder="Müşterinin sorusu..."
                        value={faq.q}
                        onChange={(e) => handleFaqChange(index, "q", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 pr-8">
                      <Label className="text-xs font-semibold">Cevap</Label>
                      <Textarea
                        placeholder="Açıklayıcı yanıtınız..."
                        value={faq.a}
                        onChange={(e) => handleFaqChange(index, "a", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
