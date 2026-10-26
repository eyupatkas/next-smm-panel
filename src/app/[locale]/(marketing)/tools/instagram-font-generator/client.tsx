"use client";
import { ToolConversionCTA } from "@/components/marketing/ToolConversionCTA";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Type } from "lucide-react";
import { toast } from "sonner";


function toUnicode(text: string, offset: number, base: number) {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(offset + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(base + (code - 97));
      return ch;
    })
    .join("");
}

const transforms: { name: string; fn: (t: string) => string }[] = [
  { name: "𝐁𝐨𝐥𝐝", fn: (t) => toUnicode(t, 0x1d400, 0x1d41a) },
  { name: "𝑰𝒕𝒂𝒍𝒊𝒄", fn: (t) => toUnicode(t, 0x1d434, 0x1d44e) },
  { name: "𝔉𝔯𝔞𝔨𝔱𝔲𝔯", fn: (t) => toUnicode(t, 0x1d504, 0x1d51e) },
  { name: "𝕄𝕠𝕟𝕠", fn: (t) => toUnicode(t, 0x1d538, 0x1d552) },
  { name: "𝖲𝖺𝗇𝗌", fn: (t) => toUnicode(t, 0x1d5a0, 0x1d5ba) },
  { name: "𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱", fn: (t) => toUnicode(t, 0x1d5d4, 0x1d5ee) },
  { name: "𝘐𝘵𝘢𝘭𝘪𝘤 𝘚𝘢𝘯𝘴", fn: (t) => toUnicode(t, 0x1d608, 0x1d622) },
  { name: "𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎", fn: (t) => toUnicode(t, 0x1d670, 0x1d68a) },
  {
    name: "Ⓒⓘⓡⓒⓛⓔⓓ",
    fn: (t) =>
      [...t]
        .map((ch) => {
          const c = ch.charCodeAt(0);
          if (c >= 65 && c <= 90) return String.fromCodePoint(0x24b6 + (c - 65));
          if (c >= 97 && c <= 122) return String.fromCodePoint(0x24d0 + (c - 97));
          return ch;
        })
        .join(""),
  },
  {
    name: "ꜱᴍᴀʟʟ ᴄᴀᴘꜱ",
    fn: (t) => {
      const map: Record<string, string> = {
        a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ",
        i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
        q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
        y: "ʏ", z: "ᴢ",
      };
      return [...t].map((ch) => map[ch.toLowerCase()] || ch).join("");
    },
  },
];

export function FontGeneratorClient() {
  const t = useTranslations("tools");
  const [text, setText] = useState("");

  function copy(val: string) {
    navigator.clipboard.writeText(val);
    toast.success(t("font.copied"));
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
            <Type size={16} /> {t("freeTool")}
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight">
            {t("font.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("font.desc")}
          </p>
        </div>

        <Card className="border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle>{t("font.cardTitle")}</CardTitle>
            <CardDescription>{t("font.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder={t("font.textPlaceholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="glass border-white/5 text-lg"
            />
          </CardContent>
        </Card>

        {text.trim() && (
          <div className="space-y-3">
            {transforms.map((tr) => {
              const converted = tr.fn(text);
              return (
                <Card key={tr.name} className="border-white/10">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <Badge variant="outline" className="text-xs">{tr.name}</Badge>
                      <p className="text-lg truncate">{converted}</p>
                    </div>
                    <button
                      onClick={() => copy(converted)}
                      className="shrink-0 ml-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title={t("font.copyTooltip")}
                    >
                      <Copy size={16} />
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="prose prose-invert max-w-none text-sm text-muted-foreground space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t("font.infoTitle1")}</h2>
          <p>{t("font.infoParagraph1")}</p>
        </div>

        {/* Conversion CTA */}
        <ToolConversionCTA platform="instagram" />
      </div>
    </div>
  );
}
