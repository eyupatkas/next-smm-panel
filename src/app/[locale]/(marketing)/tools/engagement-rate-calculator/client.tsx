"use client";
import { ToolConversionCTA } from "@/components/marketing/ToolConversionCTA";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Calculator } from "lucide-react";

export function EngagementCalculatorClient() {
  const t = useTranslations("tools");
  const [followers, setFollowers] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [result, setResult] = useState<number | null>(null);

  function calculate() {
    const f = parseFloat(followers) || 0;
    const l = parseFloat(likes) || 0;
    const c = parseFloat(comments) || 0;
    const s = parseFloat(shares) || 0;
    if (f <= 0) return;
    const rate = ((l + c + s) / f) * 100;
    setResult(Math.round(rate * 100) / 100);
  }

  function getRating(r: number) {
    if (r >= 6) return { label: t("engagement.ratingExcellent"), color: "text-green-400" };
    if (r >= 3) return { label: t("engagement.ratingGood"), color: "text-primary" };
    if (r >= 1) return { label: t("engagement.ratingAverage"), color: "text-yellow-400" };
    return { label: t("engagement.ratingLow"), color: "text-destructive" };
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
            <BarChart3 size={16} /> {t("freeTool")}
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight">
            {t("engagement.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("engagement.desc")}
          </p>
        </div>

        <Card className="border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator size={20} /> {t("engagement.cardTitle")}</CardTitle>
            <CardDescription>{t("engagement.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">{t("engagement.followers")}</Label>
                <Input type="number" placeholder="10000" value={followers} onChange={(e) => setFollowers(e.target.value)} className="glass border-white/5" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">{t("engagement.avgLikes")}</Label>
                <Input type="number" placeholder="500" value={likes} onChange={(e) => setLikes(e.target.value)} className="glass border-white/5" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">{t("engagement.avgComments")}</Label>
                <Input type="number" placeholder="20" value={comments} onChange={(e) => setComments(e.target.value)} className="glass border-white/5" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">{t("engagement.avgShares")}</Label>
                <Input type="number" placeholder="5" value={shares} onChange={(e) => setShares(e.target.value)} className="glass border-white/5" />
              </div>
            </div>
            <Button onClick={calculate} className="w-full">
              <Calculator size={16} className="mr-2" /> {t("engagement.btnCalculate")}
            </Button>
          </CardContent>
        </Card>

        {result !== null && (
          <Card className="border-primary/20 bg-primary/5 shadow-xl">
            <CardContent className="pt-6 text-center space-y-2">
              <p className="text-5xl font-bold text-primary">%{result}</p>
              <p className={`text-lg font-semibold ${getRating(result).color}`}>
                {getRating(result).label}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("engagement.industryAvg")}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="prose prose-invert max-w-none text-sm text-muted-foreground space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t("engagement.infoTitle1")}</h2>
          <p>{t("engagement.infoParagraph1")}</p>
          <h2 className="text-xl font-bold text-foreground">{t("engagement.infoTitle2")}</h2>
          <p>{t("engagement.infoParagraph2")}</p>
        </div>

        {/* Conversion CTA */}
        <ToolConversionCTA platform="instagram" />
      </div>
    </div>
  );
}
