"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { saveAiProvider } from "@/lib/actions/ai-actions";
import { Brain, CheckCircle2, Circle, KeyRound, Zap } from "lucide-react";
import type { AiProvider } from "@prisma/client";

const GEMINI_MODELS = [
  { value: "gemini-3.8-flash", label: "Gemini 3.8 Flash (En Yeni · Önerilen)" },
  { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash (İstikrarlı)" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (Ekonomik · Yüksek Hacim)" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (Ekonomik)" },
  { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview · En Yetenekli)" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
];

const DEEPSEEK_MODELS = [
  { value: "deepseek-flash", label: "DeepSeek Flash / V4.1 (Önerilen)" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro (Akıl Yürütme)" },
];

function getModels(slug: string) {
  if (slug === "gemini") return GEMINI_MODELS;
  if (slug === "deepseek") return DEEPSEEK_MODELS;
  return [];
}

function ProviderCard({
  provider,
  isDefault,
  onSetDefault,
}: {
  provider: AiProvider;
  isDefault: boolean;
  onSetDefault: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(provider.enabled);
  const [model, setModel] = useState(provider.model);
  const [apiKeys, setApiKeys] = useState((provider.apiKeys as string[]).join("\n"));
  const [saved, setSaved] = useState(false);

  const models = getModels(provider.slug);
  const keyCount = (provider.apiKeys as string[]).length;

  function handleSave() {
    const fd = new FormData();
    fd.set("id", provider.id);
    fd.set("model", model);
    fd.set("enabled", enabled ? "true" : "false");
    fd.set("isDefault", isDefault ? "true" : "false");
    fd.set("apiKeys", apiKeys);

    startTransition(async () => {
      await saveAiProvider(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  // Varsayılan yapıldığında otomatik kaydet
  const handleDefaultChange = (checked: boolean) => {
    if (checked) {
      onSetDefault();
      // Veritabanına kaydetmek için anlık istek gönder
      const fd = new FormData();
      fd.set("id", provider.id);
      fd.set("model", model);
      fd.set("enabled", "true"); // Varsayılan olan sağlayıcı otomatik aktif edilmeli
      fd.set("isDefault", "true");
      fd.set("apiKeys", apiKeys);
      setEnabled(true);
      startTransition(async () => {
        await saveAiProvider(fd);
      });
    }
  };

  const accentMap: Record<string, string> = {
    gemini: "from-blue-500/10 to-indigo-500/5",
    deepseek: "from-emerald-500/10 to-teal-500/5",
  };

  const badgeMap: Record<string, string> = {
    gemini: "Google",
    deepseek: "DeepSeek AI",
  };

  return (
    <Card className={`border-white/10 overflow-hidden transition-all ${enabled ? "shadow-lg shadow-primary/5" : "opacity-75 hover:opacity-100"}`}>
      <CardHeader className={`pb-4 border-b border-white/8 bg-gradient-to-r ${accentMap[provider.slug] ?? ""}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain size={20} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{provider.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{badgeMap[provider.slug]}</Badge>
                {enabled
                  ? <CheckCircle2 size={13} className="text-emerald-400" />
                  : <Circle size={13} className="text-muted-foreground/40" />}
              </div>
              <CardDescription className="text-xs mt-0.5">
                {keyCount > 0 ? `${keyCount} API anahtarı • ` : "API anahtarı yok • "}
                Model: {model}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <Label className="text-xs text-muted-foreground">Aktif</Label>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        {/* Default toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/5">
          <div>
            <p className="text-sm font-medium">Varsayılan Sağlayıcı</p>
            <p className="text-xs text-muted-foreground">Tüm yapay zeka ve sipariş asistanı işlemlerinde kullanılır</p>
          </div>
          <Switch checked={isDefault} onCheckedChange={handleDefaultChange} />
        </div>

        {/* Model seçimi */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Model</Label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
          >
            {getModels(provider.slug).map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* API Keys */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <KeyRound size={13} className="text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">API Anahtarları <span className="text-muted-foreground/50">(her satıra 1 anahtar)</span></Label>
          </div>
          <textarea
            value={apiKeys}
            onChange={(e) => setApiKeys(e.target.value)}
            placeholder={"API anahtarlarınızı her satıra bir tane girin...\nÖrnek: sk-abc123\nÖrnek: AIzaSy..."}
            className="w-full font-mono text-xs min-h-[90px] rounded-lg border border-white/10 bg-background px-3 py-2 resize-none"
          />
          {apiKeys.trim() && (
            <p className="text-xs text-muted-foreground">
              {apiKeys.split("\n").filter((k) => k.trim()).length} anahtar tanımlı — round-robin ile kullanılır
            </p>
          )}
        </div>

        <Button onClick={handleSave} disabled={isPending} className="w-full" size="sm">
          {isPending ? (
            <span className="flex items-center gap-2"><Zap size={14} className="animate-pulse" />Kaydediliyor...</span>
          ) : saved ? (
            <span className="flex items-center gap-2"><CheckCircle2 size={14} />Kaydedildi</span>
          ) : (
            "Kaydet"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function AiSettingsClient({ providers: initialProviders }: { providers: AiProvider[] }) {
  const [providers, setProviders] = useState<AiProvider[]>(initialProviders);
  
  const handleSetDefault = (slug: string) => {
    setProviders((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.slug === slug,
        enabled: p.slug === slug ? true : p.enabled, // Varsayılan olan sağlayıcı otomatik aktif olur
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <Brain size={20} className="text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium">Yapay Zeka Entegrasyonu</p>
          <p className="text-xs text-muted-foreground">
            Destek talepleri, otonom sipariş asistanı ve blog yazarı için varsayılan sağlayıcıyı seçin ve API anahtarı ekleyin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {providers.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            isDefault={p.isDefault}
            onSetDefault={() => handleSetDefault(p.slug)}
          />
        ))}
      </div>
    </div>
  );
}
