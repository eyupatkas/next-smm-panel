"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  saveBlogAISettings,
  generateBlogPostAI,
  addAITopicsToPool,
  addManualTopicToPool,
  deleteTopicFromPool,
  triggerAutoBlogPost,
  triggerBlogTranslation,
  resetBlogTranslations,
  initializeAllTranslations,
} from "@/lib/actions/blog-ai-actions";
import {
  createBlogPostAdmin,
  deleteBlogPostAdmin,
  updateBlogPostAdmin,
} from "@/lib/actions/admin-actions";
import type { SafeBlogPost } from "@/lib/blog-posts";
import type { BlogAISettings } from "@/lib/services/blog-ai";
import { BLOG_TRANSLATE_LANGS, getLangStatusSummary } from "@/lib/blog-constants";
import type { BlogLangStatus } from "@/lib/blog-constants";
import { Bot, Clock, Globe, Languages, ListPlus, Loader2, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

type BlogTopic = {
  id: string;
  title: string;
  used: boolean;
  usedAt: Date | null;
  createdAt: Date;
};

export function BlogManagementClient({
  posts,
  topics,
  aiSettings,
}: {
  posts: SafeBlogPost[];
  topics: BlogTopic[];
  aiSettings: BlogAISettings;
}) {
  const [aiGenerating, setAiGenerating] = useState(false);
  const [topicGenerating, setTopicGenerating] = useState(false);
  const [topicGeneratingCount, setTopicGeneratingCount] = useState<number | null>(null);
  const [autoPosting, setAutoPosting] = useState(false);
  const [translatingPostId, setTranslatingPostId] = useState<string | null>(null);
  const [initializingAll, setInitializingAll] = useState(false);

  const unusedTopicCount = topics.filter((t) => !t.used).length;

  async function handleGeneratePost(formData: FormData) {
    setAiGenerating(true);
    try {
      const result = await generateBlogPostAI(formData);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("success" in result && result.success) {
        toast.success(result.success);
      }
    } catch {
      toast.error("Blog içeriği oluşturulamadı.");
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleAddTopics(count: number) {
    setTopicGenerating(true);
    setTopicGeneratingCount(count);
    try {
      const formData = new FormData();
      formData.set("count", String(count));
      const result = await addAITopicsToPool(formData);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("success" in result && result.success) {
        toast.success(result.success);
      }
    } catch {
      toast.error("Konu üretme hatası.");
    } finally {
      setTopicGenerating(false);
      setTopicGeneratingCount(null);
    }
  }

  async function handleAutoPost() {
    setAutoPosting(true);
    try {
      const result = await triggerAutoBlogPost();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch {
      toast.error("Otomasyon hatası.");
    } finally {
      setAutoPosting(false);
    }
  }

  async function handleTranslatePost(postId: string) {
    setTranslatingPostId(postId);
    try {
      const result = await triggerBlogTranslation(postId);
      if (result.success) {
        toast.success(`Çeviriler tamamlandı: ${result.details?.join(", ") || ""}`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Çeviri başlatma hatası.");
    } finally {
      setTranslatingPostId(null);
    }
  }

  async function handleResetTranslations(postId: string) {
    try {
      const result = await resetBlogTranslations(postId);
      if (result.success) toast.success(result.message);
    } catch {
      toast.error("Sıfırlama hatası.");
    }
  }

  async function handleInitializeAll() {
    setInitializingAll(true);
    try {
      const result = await initializeAllTranslations();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.info("Tüm yazılar zaten çeviri kuyruğunda.");
      }
    } catch {
      toast.error("Kuyruğa alma hatası.");
    } finally {
      setInitializingAll(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.2),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] p-6 shadow-2xl shadow-sky-500/10">
        <p className="text-xs uppercase tracking-[0.24em] text-sky-300">Content Hub</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Blog Yönetimi</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          SEO odaklı blog yazıları oluşturun, AI ile içerik üretin, konu havuzunu yönetin ve otomatik yayınlama zamanlayın.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-sm">
            <Pencil size={14} className="mr-1" /> {posts.length} Yazı
          </Badge>
          <Badge variant="outline" className="text-sm">
            <ListPlus size={14} className="mr-1" /> {unusedTopicCount} Bekleyen Konu
          </Badge>
          <Badge variant={aiSettings.enabled ? "default" : "secondary"} className="text-sm">
            <Bot size={14} className="mr-1" /> AI {aiSettings.enabled ? "Aktif" : "Pasif"}
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Globe size={14} className="mr-1" />
            {posts.filter((p) => p.langStatus && Object.values(p.langStatus as Record<string,string>).every((v) => v === "done")).length}/{posts.length} Tam Çeviri
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="ml-auto text-xs"
            disabled={initializingAll}
            onClick={handleInitializeAll}
          >
            {initializingAll ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Languages size={14} className="mr-1.5" />}
            Tümünü Çeviri Kuyruğuna Al
          </Button>
        </div>
      </div>

      {/* AI Ayarları */}
      <Card className="border-white/10 bg-gradient-to-br from-violet-500/10 to-transparent shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center text-violet-400">
              <Bot size={24} />
            </div>
            <div>
              <CardTitle>AI İçerik Üretici Ayarları</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Google Gemini API yapılandırması ve otomasyon</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={saveBlogAISettings} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Gemini API Key</Label>
                <Input
                  name="blog_ai_api_key"
                  type="password"
                  defaultValue={aiSettings.apiKey}
                  placeholder="AIza..."
                  className="glass border-white/5 font-mono"
                />
                <p className="text-xs text-muted-foreground">Google AI Studio&apos;dan alınır. Blog sistemine özeldir.</p>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <select
                  name="blog_ai_model"
                  defaultValue={aiSettings.model}
                  className="w-full rounded-md border border-white/5 bg-background px-3 py-2 text-sm glass"
                >
                  <optgroup label="Gemini 3.8 & 3.7 (En Güncel · Önerilen)">
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (Süper Hızlı · Ajanlar için)</option>
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  </optgroup>
                  <optgroup label="Gemini 3.5 & 3.1 (İstikrarlı)">
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Ekonomik)</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Ekonomik)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (En Zeki)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                  </optgroup>
                </select>
                <p className="text-xs text-muted-foreground/60">Ücretli API anahtarı gereklidir. <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary/70">Google AI Studio</a></p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Switch name="blog_ai_enabled" defaultChecked={aiSettings.enabled} />
                <Label>AI Otomasyonu Aktif</Label>
              </div>
              <div className="space-y-2">
                <Label>Otomatik Yayınlama Sıklığı</Label>
                <select
                  name="blog_ai_auto_post_interval"
                  defaultValue={aiSettings.autoPostInterval}
                  className="w-full rounded-md border border-white/5 bg-background px-3 py-2 text-sm glass"
                >
                  <option value="off">Kapalı</option>
                  <option value="6h">Her 6 saatte</option>
                  <option value="12h">Her 12 saatte</option>
                  <option value="24h">Günde 1 kez</option>
                  <option value="48h">2 günde 1 kez</option>
                  <option value="72h">3 günde 1 kez</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="rounded-full">
                <Save size={16} className="mr-2" /> AI Ayarlarını Kaydet
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={handleAutoPost}
                disabled={autoPosting || !aiSettings.enabled}
              >
                {autoPosting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Zap size={16} className="mr-2" />}
                Şimdi Yayınla
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* AI İçerik Üretici */}
      <Card className="border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400">
              <Sparkles size={24} />
            </div>
            <CardTitle>AI ile Blog Yazısı Üret</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleGeneratePost} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                name="topic"
                placeholder="Konu girin: ör. Instagram'da organik büyüme stratejileri"
                className="glass border-white/5"
                required
              />
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="autoPublish" />
                  Direkt yayınla
                </label>
                <Button type="submit" disabled={aiGenerating} className="rounded-full">
                  {aiGenerating ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Sparkles size={16} className="mr-2" />}
                  Üret
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Konu Havuzu */}
      <Card className="border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                <ListPlus size={24} />
              </div>
              <div>
                <CardTitle>Konu Havuzu</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Otomasyon bu havuzdan sırayla konu seçip içerik üretir
                </p>
              </div>
            </div>
            <Badge variant="outline">{unusedTopicCount} bekleyen</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI ile konu ekle */}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={topicGenerating}
              onClick={() => handleAddTopics(5)}
            >
              {topicGenerating && topicGeneratingCount === 5
                ? <Loader2 size={14} className="mr-2 animate-spin" />
                : <Plus size={14} className="mr-2" />}
              +5 AI Konu Ekle
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={topicGenerating}
              onClick={() => handleAddTopics(10)}
            >
              {topicGenerating && topicGeneratingCount === 10
                ? <Loader2 size={14} className="mr-2 animate-spin" />
                : <Plus size={14} className="mr-2" />}
              +10 AI Konu Ekle
            </Button>
          </div>

          {/* Manuel konu ekle */}
          <form action={addManualTopicToPool} className="flex gap-3">
            <Input
              name="title"
              placeholder="Manuel konu başlığı girin..."
              className="glass border-white/5"
              required
            />
            <Button type="submit" variant="secondary" className="rounded-full shrink-0">
              <Plus size={14} className="mr-2" /> Ekle
            </Button>
          </form>

          {/* Konu Listesi */}
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Henüz konu yok. AI ile konu ekleyerek başlayın.</p>
          ) : (
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {topics.map((topic) => (
                <div key={topic.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={topic.used ? "secondary" : "default"} className="shrink-0 text-xs">
                      {topic.used ? "Kullanıldı" : "Bekliyor"}
                    </Badge>
                    <span className="text-sm truncate">{topic.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {topic.usedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(topic.usedAt).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                    <form action={deleteTopicFromPool}>
                      <input type="hidden" name="id" value={topic.id} />
                      <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive">
                        <Trash2 size={14} />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manuel Blog Oluştur */}
      <Card className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-2xl">
        <CardHeader>
          <CardTitle>Yeni Blog Yazısı (Manuel)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBlogPostAdmin} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="title" placeholder="Başlık" required />
              <Input name="coverImage" placeholder="Kapak görsel URL (opsiyonel)" />
            </div>
            <Input name="excerpt" placeholder="Kısa özet" />
            <textarea
              name="content"
              placeholder="Blog içeriği"
              required
              className="min-h-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="published" /> Yayında
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="featured" /> Öne Çıkan
              </label>
              <Button type="submit" className="ml-auto">
                Yazı Oluştur
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Mevcut Yazılar */}
      <div className="grid gap-4">
        {posts.length === 0 && (
          <Card className="border-white/10 shadow-lg">
            <CardContent className="pt-6 text-sm text-muted-foreground">Henüz blog yazısı yok.</CardContent>
          </Card>
        )}
        {posts.map((post) => {
          const langStatus = post.langStatus as BlogLangStatus | null;
          const summary = getLangStatusSummary(langStatus);
          const isTranslating = translatingPostId === post.id;

          return (
          <Card key={post.id} className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl">{post.title}</CardTitle>
                {/* Çeviri durumu özeti */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe size={12} />
                    <span className={summary.done === summary.total ? "text-emerald-400" : summary.done > 0 ? "text-amber-400" : "text-muted-foreground"}>
                      {summary.done}/{summary.total} dil
                    </span>
                  </span>
                  {/* Dil rozetleri */}
                  <div className="flex flex-wrap gap-1">
                    {BLOG_TRANSLATE_LANGS.map((lang) => {
                      const s = langStatus?.[lang];
                      const color = s === "done" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : s === "error" ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : s === "pending" ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-white/5 text-muted-foreground border-white/10";
                      return (
                        <span key={lang} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border ${color}`}>
                          {lang}
                        </span>
                      );
                    })}
                  </div>
                  {/* Çeviri aksiyonları */}
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 rounded-full px-2 text-xs"
                      disabled={isTranslating}
                      onClick={() => handleTranslatePost(post.id)}
                    >
                      {isTranslating
                        ? <Loader2 size={10} className="mr-1 animate-spin" />
                        : <Sparkles size={10} className="mr-1" />}
                      Çevir
                    </Button>
                    {summary.error > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 rounded-full px-2 text-xs text-amber-400"
                        onClick={() => handleResetTranslations(post.id)}
                      >
                        <RefreshCw size={10} className="mr-1" />
                        Düzelt
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={post.published ? "default" : "secondary"}>
                  {post.published ? "Yayında" : "Taslak"}
                </Badge>
                {post.featured && <Badge variant="outline">Öne Çıkan</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <form action={updateBlogPostAdmin} className="grid gap-4">
                <input type="hidden" name="id" value={post.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input name="title" defaultValue={post.title} required />
                  <Input name="slug" defaultValue={post.slug} required />
                </div>
                <Input name="coverImage" defaultValue={post.coverImage ?? ""} placeholder="Kapak görsel URL" />
                <Input name="excerpt" defaultValue={post.excerpt ?? ""} placeholder="Kısa özet" />
                <textarea
                  name="content"
                  defaultValue={post.content}
                  required
                  className="min-h-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" name="published" defaultChecked={post.published} /> Yayında
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" name="featured" defaultChecked={post.featured} /> Öne Çıkan
                  </label>
                  <div className="ml-auto flex gap-2">
                    <Button type="submit" variant="outline">
                      Kaydet
                    </Button>
                  </div>
                </div>
              </form>
              <form action={deleteBlogPostAdmin} className="mt-3">
                <input type="hidden" name="id" value={post.id} />
                <Button type="submit" variant="destructive" size="sm">
                  Sil
                </Button>
              </form>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
