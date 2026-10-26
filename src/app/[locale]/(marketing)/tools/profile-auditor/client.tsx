"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  Lightbulb, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ToolConversionCTA } from "@/components/marketing/ToolConversionCTA";

// Inline SVG Icons
function InstagramIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
      <polygon points="10 15 15 12 10 9" />
    </svg>
  );
}

type AuditReport = {
  score: number;
  bioEvaluation: string;
  bioSuggestions: string[];
  contentStrategy: string[];
  engagementAnalysis: string[];
};

type RecommendedService = {
  id: string;
  name: string;
  retailPrice: number;
  min: number;
  max: number;
  category: {
    name: string;
  };
};

export function ProfileAuditorClient() {
  const locale = useLocale();
  const [profileUrl, setProfileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [recommendedServices, setRecommendedServices] = useState<RecommendedService[]>([]);
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");

  const isTr = locale === "tr";

  async function handleAnalyze() {
    if (!profileUrl.trim()) {
      toast.error(isTr ? "Lütfen bir profil linki girin." : "Please enter a profile link.");
      return;
    }

    setLoading(true);
    setReport(null);
    setRecommendedServices([]);

    try {
      const res = await fetch("/api/tools/profile-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isTr ? "Analiz başarısız oldu." : "Analysis failed."));
      }

      setReport(data.report);
      setRecommendedServices(data.recommendedServices);
      setPlatform(data.platform);
      setUsername(data.username);
      toast.success(isTr ? "Profil başarıyla analiz edildi!" : "Profile analyzed successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Başlık ve Tanım */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm text-primary font-semibold tracking-wide animate-pulse">
            <Sparkles size={16} /> 
            {isTr ? "Yapay Zeka Destekli Büyüme Aracı" : "AI-Powered Growth Tool"}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-pink-500">
            {isTr ? "Sosyal Medya Profil Analizörü" : "Social Media Profile Auditor"}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            {isTr 
              ? "Instagram, TikTok veya YouTube profilinizi analiz edin, AI tabanlı gelişim puanınızı görün ve size özel büyüme reçetesini alın."
              : "Audit your Instagram, TikTok, or YouTube profile, see your AI-based score, and get your custom growth prescription."}
          </p>
        </div>

        {/* Giriş Kartı */}
        <Card className="border-white/10 shadow-2xl bg-gradient-to-br from-card to-card/60 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {isTr ? "Profil Linki" : "Profile Link"}
              </label>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder={isTr ? "Örn: https://instagram.com/kullanici_adi" : "E.g., https://instagram.com/username"}
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    className="glass border-white/10 text-base py-6 pl-11 focus:border-primary/50"
                  />
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Button 
                  onClick={handleAnalyze} 
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all text-white font-bold py-6 px-8 rounded-xl shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isTr ? "Analiz Ediliyor..." : "Analyzing..."}
                    </div>
                  ) : (
                    isTr ? "Analizi Başlat" : "Start Analysis"
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground border-t border-white/5 pt-4">
              <span className="flex items-center gap-1.5"><InstagramIcon size={14} className="text-pink-400" /> Instagram</span>
              <span className="flex items-center gap-1.5"><Zap size={14} className="text-yellow-400" /> TikTok</span>
              <span className="flex items-center gap-1.5"><YoutubeIcon size={14} className="text-red-500" /> YouTube</span>
            </div>
          </CardContent>
        </Card>

        {/* Tarama Esnasında Yükleniyor Durumu */}
        {loading && (
          <Card className="border-white/10 bg-card/40 p-8 text-center space-y-6 animate-pulse">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" style={{ animationDirection: "reverse" }} />
              <div className="absolute inset-4 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{isTr ? "Profil Verileri Analiz Ediliyor" : "Analyzing Profile Data"}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {isTr 
                  ? "Gemini AI modelimiz profili tarıyor, bio verimliliğini değerlendiriyor ve organik büyüme hedeflerinizi hesaplıyor..."
                  : "Our Gemini AI model is scanning the profile, evaluating bio efficiency, and calculating your organic growth targets..."}
              </p>
            </div>
          </Card>
        )}

        {/* Analiz Sonucu */}
        {report && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Rapor Hero/Skor Kartı */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-white/10 bg-gradient-to-br from-card to-card/60 p-6 flex flex-col justify-between items-center text-center relative overflow-hidden md:col-span-1">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{isTr ? "Profil Skoru" : "Profile Score"}</h3>
                
                <div className="relative w-36 h-36 my-6 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="62" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="62" 
                      stroke="url(#scoreGrad)" 
                      strokeWidth="10" 
                      fill="transparent"
                      strokeDasharray={390}
                      strokeDashoffset={390 - (390 * report.score) / 100}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-4xl font-black">{report.score}</span>
                </div>
                
                <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-xs tracking-widest px-3 py-1 font-bold">
                  {report.score >= 80 ? (isTr ? "Mükemmel" : "Excellent") : report.score >= 60 ? (isTr ? "Geliştirilebilir" : "Good") : (isTr ? "Zayıf" : "Needs Work")}
                </Badge>
              </Card>

              {/* Bio Değerlendirme & Önerileri */}
              <Card className="border-white/10 bg-gradient-to-br from-card to-card/60 p-6 md:col-span-2 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <TrendingUp size={20} className="text-primary" />
                  <h3 className="text-lg font-bold">{isTr ? "Bio ve Profil Değerlendirmesi" : "Bio & Profile Evaluation"}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-7">{report.bioEvaluation}</p>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isTr ? "Önerilen Bio Alternatifleri" : "Recommended Bio Alternatives"}</h4>
                  <div className="space-y-2">
                    {report.bioSuggestions.map((s, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-medium flex gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="whitespace-pre-line">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* İçerik Stratejisi & Etkileşim Analizi */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-white/10 bg-gradient-to-br from-card to-card/60 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Lightbulb size={20} className="text-yellow-400" />
                  <h3 className="text-lg font-bold">{isTr ? "İçerik Fikirleri & Stratejisi" : "Content Ideas & Strategy"}</h3>
                </div>
                <div className="space-y-3">
                  {report.contentStrategy.map((s, idx) => (
                    <div key={idx} className="flex gap-3 text-sm leading-6">
                      <span className="w-6 h-6 rounded-full bg-yellow-400/10 text-yellow-400 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                      <p className="text-muted-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-white/10 bg-gradient-to-br from-card to-card/60 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  <h3 className="text-lg font-bold">{isTr ? "Etkileşim Analizi" : "Engagement Analysis"}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-7">{report.engagementAnalysis}</p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 text-xs leading-5">
                  <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-emerald-400/95 font-medium">
                    {isTr 
                      ? "Profil etkileşiminizi yükseltmek, algoritmanın sizi Keşfet sayfalarında öne çıkarması için ilk 24 saatteki ivme kritik önemdedir."
                      : "To boost your profile engagement, the momentum in the first 24 hours is critical for the algorithm to push you onto Explore pages."}
                  </p>
                </div>
              </Card>
            </div>

            {/* Büyüme Reçetesi (Paket Önerme) */}
            <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-pink-500/10 rounded-full blur-2xl" />
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-400">
                  <Sparkles size={20} className="text-primary" />
                  {isTr ? "Profiliniz İçin Büyüme Reçetesi" : "Your Custom Growth Prescription"}
                </CardTitle>
                <CardDescription>
                  {isTr 
                    ? "Yapay zeka analizine göre profilinizi uçuracak en etkili paket önerilerimiz:"
                    : "Based on AI analysis, here are the most effective package recommendations to skyrocket your profile:"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                {recommendedServices.map((svc) => (
                  <Card key={svc.id} className="border-white/5 bg-background/50 hover:bg-background/80 hover:border-primary/30 transition-all flex flex-col justify-between overflow-hidden group relative">
                    <div className="p-4 space-y-3">
                      <Badge variant="outline" className="text-[10px] uppercase border-primary/20 text-primary/80 tracking-widest">{svc.category.name}</Badge>
                      <h4 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">{svc.name}</h4>
                    </div>
                    <div className="p-4 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground block">{isTr ? "1000 Adet" : "Per 1000"}</span>
                        <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-400">
                          ₺{svc.retailPrice.toFixed(2)}
                        </span>
                      </div>
                      <Link 
                        href={`/${locale}/services`}
                        className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white flex items-center justify-center transition-all"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>

          </div>
        )}

        {/* Conversion CTA */}
        <ToolConversionCTA platform={(platform || "instagram") as any} />

      </div>
    </div>
  );
}
