"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Share2, 
  Coins, 
  MousePointerClick, 
  Gift, 
  Copy, 
  Check, 
  ArrowRight, 
  ArrowLeftRight, 
  Send, 
  MessageCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

// Inline SVG Icon
function TwitterIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

type ReferredUser = {
  id: string;
  name: string;
  createdAt: string;
};

type ReferralTransaction = {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
};

export function ReferralsClient() {
  const locale = useLocale();
  const t = useTranslations("referralsPage");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    referralCode: string;
    referralBalance: number;
    referredClicks: number;
    referredCount: number;
    referredUsers: ReferredUser[];
    transactions: ReferralTransaction[];
    totalEarned: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/dashboard/referrals");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("[referrals-client] Load failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // Tarayıcı origin bilgisini alarak link oluştur
  const origin = typeof window !== "undefined" ? window.location.origin : "https://optismm.com";
  const refLink = stats?.referralCode 
    ? `${origin}/${locale}/signup?ref=${stats.referralCode}`
    : `${origin}/${locale}/signup`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    toast.success(t("copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  async function handleConvert() {
    if (!stats || stats.referralBalance <= 0) {
      toast.error(t("noCommission"));
      return;
    }

    setConverting(true);
    try {
      const res = await fetch("/api/dashboard/referrals/convert", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t("conversionSuccess"));
        // İstatistikleri güncelle
        fetchStats();
        // Global bakiye güncellemesi için sayfayı yenile veya event tetikle
        window.location.reload();
      } else {
        toast.error(data.error || t("conversionError"));
      }
    } catch (err) {
      toast.error(t("conversionError"));
    } finally {
      setConverting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Üst Kahraman Kartı */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-950 via-background to-purple-950/40 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-2xl space-y-6">
          <Badge className="bg-primary/20 text-primary border-primary/30 py-1.5 px-3 uppercase tracking-widest text-xs font-black">
            {t("title")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Arkadaşlarını Davet Et, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-400">Birlikte Kazanın!</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl">
            {t("subtitle")}
          </p>
        </div>

        {/* 3D ışıltılı referans paylaşım kutusu */}
        <div className="mt-8 grid gap-6 md:grid-cols-3 items-end">
          <div className="md:col-span-2 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              {t("shareLink")}
            </span>
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-1.5 focus-within:border-primary/50 transition-all">
              <input 
                type="text" 
                readOnly 
                value={refLink} 
                className="bg-transparent text-sm w-full pl-3 pr-20 py-2 focus:outline-none select-all"
              />
              <Button 
                onClick={copyToClipboard}
                className="absolute right-1.5 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 text-xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Kopyalandı" : "Kopyala"}
              </Button>
            </div>
          </div>

          {/* Sosyal Paylaşım Hızlı Butonları */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              {locale === "tr" ? "Hızlı Paylaş" : "Quick Share"}
            </span>
            <div className="flex gap-2">
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(refLink)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 flex items-center justify-center transition-all"
              >
                <MessageCircle size={18} />
              </a>
              <a 
                href={`https://t.me/share/url?url=${encodeURIComponent(refLink)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center transition-all"
              >
                <Send size={18} />
              </a>
              <a 
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(refLink)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 flex items-center justify-center transition-all"
              >
                <TwitterIcon size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* İstatistik Özet Kartları */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tıklanma sayısı */}
        <Card className="border-white/5 bg-card/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">{t("clicks")}</span>
              <span className="text-3xl font-black tracking-tight">{stats?.referredClicks || 0}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <MousePointerClick size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Kayıt olan üye sayısı */}
        <Card className="border-white/5 bg-card/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl group-hover:bg-pink-500/10 transition-all" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">{t("referredCount")}</span>
              <span className="text-3xl font-black tracking-tight">{stats?.referredCount || 0}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Toplam kazanılan bakiye */}
        <Card className="border-white/5 bg-card/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">{t("totalEarned")}</span>
              <span className="text-3xl font-black tracking-tight text-emerald-400">
                ₺{stats?.totalEarned.toFixed(2)}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Çekilebilir referans cüzdanı */}
        <Card className="border-primary/20 bg-primary/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-primary/80 block">{t("availableCommission")}</span>
              <span className="text-3xl font-black tracking-tight text-primary">
                ₺{stats?.referralBalance.toFixed(2)}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
              <Gift size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cüzdandan Hesaba Aktarma Paneli */}
      {stats && stats.referralBalance > 0 && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-purple-500/5 to-transparent relative overflow-hidden">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 z-10 relative">
            <div className="space-y-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles size={18} className="text-primary animate-pulse" />
                Referans Kazancınızı Ana Bakiyeye Dönüştürün!
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Cüzdanınızda biriken <strong>₺{stats.referralBalance.toFixed(2)}</strong> komisyon bakiyesini tek tıkla site içi harcanabilir ana bakiyenize aktarıp hemen sipariş geçmeye başlayabilirsiniz.
              </p>
            </div>
            <Button
              disabled={converting}
              onClick={handleConvert}
              className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white font-bold py-6 px-8 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              {converting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowLeftRight size={18} />
              )}
              {t("convertToBalance")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Listeler (Üyeler ve Geçmiş) */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Davet Edilen Üyeler Listesi */}
        <Card className="border-white/5 bg-card/30">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users size={18} className="text-pink-400" />
              {t("referredUsersList")}
            </CardTitle>
            <CardDescription>
              Referans linkiniz ile üye olan son kullanıcıların listesi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!stats?.referredUsers || stats.referredUsers.length === 0) ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                {t("noReferredUsers")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-xs uppercase text-foreground border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">{t("tableUser")}</th>
                      <th className="py-3 px-4 text-right">{t("tableDate")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.referredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {user.name}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {new Date(user.createdAt).toLocaleDateString(locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referans Kazanç Geçmişi */}
        <Card className="border-white/5 bg-card/30">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Coins size={18} className="text-emerald-400" />
              {t("earningsHistory")}
            </CardTitle>
            <CardDescription>
              Davet ettiğiniz üyelerin bakiye yüklemelerinden kazandığınız komisyon geçmişi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!stats?.transactions || stats.transactions.length === 0) ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                {t("noTransactions")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-xs uppercase text-foreground border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">{t("tableDesc")}</th>
                      <th className="py-3 px-4 text-right">{t("tableAmount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="text-foreground font-medium line-clamp-1">{tx.description}</p>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {new Date(tx.createdAt).toLocaleString(locale)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                          +₺{tx.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
