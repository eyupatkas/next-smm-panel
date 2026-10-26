"use client";
import { ToolConversionCTA } from "@/components/marketing/ToolConversionCTA";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

type Platform = "instagram" | "tiktok" | "youtube" | "twitter";

const bestTimes: Record<Platform, { day: string; times: string[] }[]> = {
  instagram: [
    { day: "Pazartesi", times: ["11:00", "14:00", "20:00"] },
    { day: "Salı", times: ["09:00", "13:00", "19:00"] },
    { day: "Çarşamba", times: ["11:00", "15:00", "21:00"] },
    { day: "Perşembe", times: ["10:00", "14:00", "20:00"] },
    { day: "Cuma", times: ["10:00", "13:00", "19:00"] },
    { day: "Cumartesi", times: ["09:00", "12:00", "18:00"] },
    { day: "Pazar", times: ["10:00", "14:00", "19:00"] },
  ],
  tiktok: [
    { day: "Pazartesi", times: ["06:00", "10:00", "22:00"] },
    { day: "Salı", times: ["02:00", "09:00", "18:00"] },
    { day: "Çarşamba", times: ["07:00", "11:00", "20:00"] },
    { day: "Perşembe", times: ["09:00", "12:00", "19:00"] },
    { day: "Cuma", times: ["05:00", "13:00", "15:00"] },
    { day: "Cumartesi", times: ["11:00", "19:00", "21:00"] },
    { day: "Pazar", times: ["07:00", "10:00", "16:00"] },
  ],
  youtube: [
    { day: "Pazartesi", times: ["14:00", "16:00"] },
    { day: "Salı", times: ["14:00", "16:00"] },
    { day: "Çarşamba", times: ["14:00", "16:00"] },
    { day: "Perşembe", times: ["12:00", "15:00"] },
    { day: "Cuma", times: ["12:00", "15:00"] },
    { day: "Cumartesi", times: ["09:00", "11:00"] },
    { day: "Pazar", times: ["09:00", "11:00"] },
  ],
  twitter: [
    { day: "Pazartesi", times: ["08:00", "12:00", "17:00"] },
    { day: "Salı", times: ["09:00", "12:00", "16:00"] },
    { day: "Çarşamba", times: ["09:00", "12:00", "17:00"] },
    { day: "Perşembe", times: ["08:00", "11:00", "16:00"] },
    { day: "Cuma", times: ["09:00", "12:00"] },
    { day: "Cumartesi", times: ["10:00", "13:00"] },
    { day: "Pazar", times: ["10:00", "14:00"] },
  ],
};

const platforms: { key: Platform; label: string; color: string }[] = [
  { key: "instagram", label: "Instagram", color: "bg-pink-500/20 text-pink-400" },
  { key: "tiktok", label: "TikTok", color: "bg-cyan-500/20 text-cyan-400" },
  { key: "youtube", label: "YouTube", color: "bg-red-500/20 text-red-400" },
  { key: "twitter", label: "Twitter/X", color: "bg-blue-500/20 text-blue-400" },
];

export function PostPlannerClient() {
  const t = useTranslations("tools");
  const [selected, setSelected] = useState<Platform>("instagram");

  const data = bestTimes[selected];

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
            <Calendar size={16} /> {t("freeTool")}
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight">
            {t("planner.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("planner.desc")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {platforms.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelected(p.key)}
              className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                selected === p.key
                  ? `${p.color} border-current`
                  : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Card className="border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              {t("planner.cardTitle", { platform: platforms.find((p) => p.key === selected)?.label ?? selected })}
            </CardTitle>
            <CardDescription>{t("planner.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.map((d) => (
                <div key={d.day} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-semibold">{t(`planner.days.${d.day}`)}</span>
                  <div className="flex flex-wrap gap-2">
                    {d.times.map((time) => (
                      <Badge key={time} variant="secondary" className="text-sm py-1 px-3">
                        {time}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="prose prose-invert max-w-none text-sm text-muted-foreground space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t("planner.infoTitle1")}</h2>
          <p>{t("planner.infoParagraph1")}</p>
          <h2 className="text-xl font-bold text-foreground">{t("planner.infoTitle2")}</h2>
          <p>{t("planner.infoParagraph2")}</p>
        </div>

        {/* Conversion CTA */}
        <ToolConversionCTA platform="general" />
      </div>
    </div>
  );
}
