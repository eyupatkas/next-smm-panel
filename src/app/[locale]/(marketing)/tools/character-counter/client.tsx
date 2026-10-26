"use client";
import { ToolConversionCTA } from "@/components/marketing/ToolConversionCTA";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Type } from "lucide-react";

const limits = [
  { platform: "Instagram Bio", max: 150 },
  { platform: "Instagram Caption", max: 2200 },
  { platform: "Twitter/X Post", max: 280 },
  { platform: "TikTok Caption", max: 2200 },
  { platform: "YouTube Başlık", max: 100 },
  { platform: "YouTube Açıklama", max: 5000 },
  { platform: "LinkedIn Post", max: 3000 },
  { platform: "Facebook Post", max: 63206 },
];

export function CharacterCounterClient() {
  const t = useTranslations("tools");
  const [text, setText] = useState("");

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text ? text.split("\n").length : 0;

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
            <Type size={16} /> {t("freeTool")}
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight">
            {t("character.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("character.desc")}
          </p>
        </div>

        <Card className="border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle>{t("character.cardTitle")}</CardTitle>
            <CardDescription>{t("character.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("character.placeholder")}
              className="w-full min-h-[180px] rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                <p className="text-2xl font-bold text-primary">{charCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("character.characters")}</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                <p className="text-2xl font-bold text-primary">{wordCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("character.words")}</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                <p className="text-2xl font-bold text-primary">{lineCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("character.lines")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle>{t("character.limitsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {limits.map((l) => {
                const pct = Math.min((charCount / l.max) * 100, 100);
                const over = charCount > l.max;
                return (
                  <div key={l.platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{l.platform}</span>
                      <span className={over ? "text-destructive font-bold" : "text-muted-foreground"}>
                        {charCount}/{l.max}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="prose prose-invert max-w-none text-sm text-muted-foreground space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t("character.infoTitle1")}</h2>
          <p>{t("character.infoParagraph1")}</p>
        </div>

        {/* Conversion CTA */}
        <ToolConversionCTA platform="general" />
      </div>
    </div>
  );
}
