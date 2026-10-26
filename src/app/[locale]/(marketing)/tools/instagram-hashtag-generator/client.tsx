"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Hash, Sparkles } from "lucide-react";
import { ToolConversionCTA } from "@/components/marketing/ToolConversionCTA";
import { toast } from "sonner";

const HASHTAG_DB: Record<string, string[]> = {
  genel: ["#kesfet", "#türkiye", "#instagram", "#trending", "#viral", "#gündem", "#popüler", "#takip", "#beğeni", "#paylaş", "#instagood", "#instadaily", "#photooftheday", "#love", "#happy"],
  moda: ["#moda", "#fashion", "#style", "#ootd", "#tarz", "#giyim", "#trend", "#streetstyle", "#fashionblogger", "#modatrend", "#kıyafet", "#stilönerisi", "#outfit", "#fashionista", "#lookoftheday"],
  yemek: ["#yemek", "#food", "#foodporn", "#lezzet", "#tarif", "#mutfak", "#yemektarifi", "#homemade", "#instafood", "#foodie", "#chef", "#cooking", "#yummy", "#delicious", "#turkisffood"],
  seyahat: ["#seyahat", "#travel", "#gezi", "#wanderlust", "#tatil", "#vacation", "#explore", "#travelgram", "#holiday", "#türkiyegezisi", "#keşfet", "#doğa", "#nature", "#adventure", "#instatravel"],
  fitness: ["#fitness", "#gym", "#workout", "#spor", "#sağlık", "#health", "#motivation", "#fitlife", "#training", "#bodybuilding", "#exercise", "#fit", "#strong", "#gains", "#sporsal"],
  teknoloji: ["#teknoloji", "#tech", "#technology", "#yazılım", "#developer", "#coding", "#software", "#ai", "#startup", "#dijital", "#inovasyon", "#gadget", "#programming", "#webdev", "#techlife"],
  güzellik: ["#güzellik", "#beauty", "#makyaj", "#makeup", "#skincare", "#ciltbakımı", "#cosmetics", "#beautycare", "#selfcare", "#glam", "#beautyblogger", "#makeupartist", "#lips", "#eyes", "#glow"],
};

const categories = Object.keys(HASHTAG_DB);

export function HashtagGeneratorClient() {
  const t = useTranslations("tools");
  const [keyword, setKeyword] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>(["genel"]);
  const [generated, setGenerated] = useState<string[]>([]);

  function generate() {
    const pool: string[] = [];
    selectedCats.forEach((c) => {
      pool.push(...(HASHTAG_DB[c] || []));
    });
    if (keyword.trim()) {
      pool.push(`#${keyword.trim().replace(/\s+/g, "").toLowerCase()}`);
    }
    const unique = [...new Set(pool)];
    const shuffled = unique.sort(() => Math.random() - 0.5).slice(0, 30);
    setGenerated(shuffled);
  }

  function copyAll() {
    navigator.clipboard.writeText(generated.join(" "));
    toast.success(t("hashtag.copied"));
  }

  function toggleCat(c: string) {
    setSelectedCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
            <Hash size={16} /> {t("freeTool")}
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight">
            {t("hashtag.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("hashtag.desc")}
          </p>
        </div>

        <Card className="border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles size={20} /> {t("hashtag.cardTitle")}</CardTitle>
            <CardDescription>{t("hashtag.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder={t("hashtag.keywordPlaceholder")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="glass border-white/5"
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge
                  key={c}
                  variant={selectedCats.includes(c) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleCat(c)}
                >
                  {t(`hashtag.categories.${c}`)}
                </Badge>
              ))}
            </div>
            <Button onClick={generate} className="w-full">
              <Sparkles size={16} className="mr-2" /> {t("hashtag.btnGenerate")}
            </Button>
          </CardContent>
        </Card>

        {generated.length > 0 && (
          <Card className="border-white/10 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("hashtag.hashtagCount", { count: generated.length })}</CardTitle>
              <Button variant="outline" size="sm" onClick={copyAll}>
                <Copy size={14} className="mr-2" /> {t("hashtag.copyAll")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {generated.map((h) => (
                  <Badge key={h} variant="secondary" className="text-sm py-1 px-3">
                    {h}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="prose prose-invert max-w-none text-sm text-muted-foreground space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t("hashtag.infoTitle1")}</h2>
          <p>{t("hashtag.infoParagraph1")}</p>
          <h2 className="text-xl font-bold text-foreground">{t("hashtag.infoTitle2")}</h2>
          <p>{t("hashtag.infoParagraph2")}</p>
        </div>

        {/* Conversion CTA */}
        <ToolConversionCTA platform="instagram" />
      </div>
    </div>
  );
}
