"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Sparkles, 
  CheckCircle, 
  Coins, 
  Lock, 
  Zap, 
  Award,
  ChevronRight,
  RefreshCw,
  Gift
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type Quest = {
  id: string;
  title: string;
  description: string | null;
  rewardXp: number;
  rewardCoin: number;
  completed: boolean;
  completedAt: string | null;
};

type UserStats = {
  xp: number;
  level: number;
  questCoins: number;
  balance: number;
};

export default function GrowthQuestsPage() {
  const locale = useLocale();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isTr = locale === "tr";

  async function fetchQuests() {
    try {
      const res = await fetch("/api/dashboard/quests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuests(data.quests);
      setStats(data.userStats);
    } catch (error: any) {
      toast.error(error.message || (isTr ? "Görevler alınamadı." : "Failed to load quests."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuests();
  }, []);

  async function handleCompleteQuest(questId: string) {
    setActionLoading(questId);
    try {
      const res = await fetch("/api/dashboard/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      if (data.leveledUp) {
        toast.success(
          isTr 
            ? `🎉 Tebrikler! Seviye atladınız! Yeni Seviye: ${data.newLevel}` 
            : `🎉 Congratulations! Leveled up! New Level: ${data.newLevel}`,
          { duration: 6000 }
        );
      }
      
      // Yeniden verileri yükle
      fetchQuests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{isTr ? "Görevler yükleniyor..." : "Loading quests..."}</p>
      </div>
    );
  }

  const xpNeeded = stats ? stats.level * 100 : 100;
  const xpPercent = stats ? Math.min((stats.xp / xpNeeded) * 100, 100) : 0;

  // Rütbe Belirleme
  const getRankName = (level: number) => {
    if (level >= 20) return isTr ? "Efsanevi Sosyal Medya Gurusu" : "Legendary Social Media Guru";
    if (level >= 10) return isTr ? "Kıdemli Büyüme Uzmanı" : "Senior Growth Specialist";
    if (level >= 5) return isTr ? "Sosyal Medya Sihirbazı" : "Social Media Wizard";
    return isTr ? "Sosyal Medya Çırağı" : "Social Media Apprentice";
  };

  return (
    <div className="space-y-8 w-full">
      
      {/* Oyunlaştırma Başlık ve Profil İlerlemesi */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Karakter Rütbe & Seviye Kartı */}
        <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 relative overflow-hidden md:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary/20">
              {stats?.level}
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-primary font-bold">{isTr ? "Mevcut Seviye" : "Current Level"}</span>
              <h3 className="font-extrabold text-lg">{getRankName(stats?.level || 1)}</h3>
            </div>
          </div>
          
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-semibold">
              <span>{isTr ? "XP Gelişimi" : "XP Progress"}</span>
              <span>{stats?.xp} / {xpNeeded} XP</span>
            </div>
            <Progress value={xpPercent} className="h-2.5 bg-white/5" />
          </div>
        </Card>

        {/* Ödüller & İstatistikler */}
        <Card className="border-white/10 bg-gradient-to-br from-card to-card/60 p-6 md:col-span-2 grid grid-cols-2 gap-4">
          <div className="border-r border-white/5 pr-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <Coins size={14} className="text-yellow-400" />
                {isTr ? "Görev Coinleri" : "Quest Coins"}
              </div>
              <h4 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
                {stats?.questCoins.toFixed(2)}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isTr 
                ? "Görevleri tamamlayarak kazandığınız toplam hediye coin miktarı."
                : "Total gift coins earned by completing growth quests."}
            </p>
          </div>

          <div className="pl-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <Trophy size={14} className="text-primary" />
                {isTr ? "Hediye Bakiyeniz" : "Gift Balance"}
              </div>
              <h4 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-400">
                ₺{stats?.balance.toFixed(2)}
              </h4>
            </div>
            <Link 
              href={`/${locale}/dashboard/new-order`}
              className="inline-flex items-center text-xs font-bold text-primary hover:text-primary/80 mt-2"
            >
              {isTr ? "Bakiyeyi Harca" : "Spend Balance"} <ChevronRight size={12} className="ml-0.5" />
            </Link>
          </div>
        </Card>

      </div>

      {/* Günlük Görevler */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold font-display">{isTr ? "Günlük Görevlerin" : "Daily Quests"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isTr 
                ? "Her gün yenilenen görevleri tamamla, seviye atla ve hediye bakiyeler kazan!"
                : "Complete daily quests, level up, and earn free gift balance!"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchQuests} className="glass">
            <RefreshCw size={14} className="mr-1.5" /> {isTr ? "Yenile" : "Refresh"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {quests.map((quest) => (
            <Card 
              key={quest.id} 
              className={`border-white/10 overflow-hidden flex flex-col justify-between relative group ${quest.completed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card/40 hover:bg-card/80 transition-all"}`}
            >
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <Badge 
                    variant="outline" 
                    className={quest.completed ? "border-emerald-500/30 text-emerald-400" : "border-primary/30 text-primary"}
                  >
                    {quest.completed ? (isTr ? "Tamamlandı" : "Completed") : (isTr ? "Aktif" : "Active")}
                  </Badge>
                  
                  <div className="flex gap-1.5 text-xs font-bold">
                    <span className="flex items-center gap-1 text-primary"><Sparkles size={12} /> +{quest.rewardXp} XP</span>
                    <span className="flex items-center gap-1 text-yellow-400"><Coins size={12} /> +₺{quest.rewardCoin.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors">{quest.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{quest.description}</p>
                </div>
              </div>

              <div className="p-5 pt-0">
                {quest.completed ? (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                    <CheckCircle size={14} /> {isTr ? "Ödül Alındı" : "Reward Claimed"}
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleCompleteQuest(quest.id)} 
                    disabled={actionLoading === quest.id}
                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all text-white font-semibold rounded-xl text-xs py-5"
                  >
                    {actionLoading === quest.id ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      isTr ? "Görevi Tamamla & Ödülü Al" : "Complete & Claim"
                    )}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Rütbe ve Ödüller Açıklama Bölümü */}
      <Card className="border-white/10 bg-card/20 p-6">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <Gift size={20} />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-sm">{isTr ? "Oyunlaştırma Nasıl Çalışır?" : "How Gamification Works?"}</h3>
            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                {isTr 
                  ? "1. Her gün OptiSMM paneline giriş yaparak, siparişler geçerek veya sosyal görevleri tamamlayarak XP ve Hediye Bakiye kazanabilirsiniz."
                  : "1. Earn XP and free Gift Balance every day just by logging in, placing orders, or completing social tasks."}
              </p>
              <p>
                {isTr 
                  ? "2. Seviye atladıkça rütbeniz yükselir. Yüksek rütbelerde tüm servislerde geçerli kalıcı ekstra indirim oranları hesabınıza otomatik tanımlanır."
                  : "2. Your rank increases as you level up. Higher ranks unlock permanent discounts across all services automatically."}
              </p>
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}
