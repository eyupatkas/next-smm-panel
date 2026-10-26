"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Gift, ArrowRight, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RecoveryNotification() {
  const locale = useLocale();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [recoveryData, setRecoveryData] = useState<{
    id: string;
    pageType: string;
    couponCode: string;
  } | null>(null);

  const isTr = locale === "tr";

  useEffect(() => {
    // 5 saniye sonra terk edilmiş sepet/işlem kontrolü yap
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/dashboard/recovery/track");
        if (!res.ok) return;
        const data = await res.json();
        if (data.active) {
          setRecoveryData({
            id: data.id,
            pageType: data.pageType,
            couponCode: data.couponCode,
          });
          setVisible(true);
        }
      } catch (err) {
        console.error("[recovery-notification] Check failed:", err);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  async function handleClaim() {
    if (!recoveryData) return;

    // Panoya kopyala
    navigator.clipboard.writeText(recoveryData.couponCode);
    toast.success(
      isTr 
        ? "Kupon kodu kopyalandı! Ödeme/Sipariş esnasında kullanabilirsiniz." 
        : "Coupon code copied! You can use it during payment/order."
    );

    // recovered = true olarak işaretle
    try {
      await fetch("/api/dashboard/recovery/track", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recoveryData.id }),
      });
    } catch (err) {
      console.error("[recovery-notification] Update failed:", err);
    }

    setVisible(false);

    // Yarım kalan sayfaya yönlendir
    const targetUrl = recoveryData.pageType === "ORDER" 
      ? `/${locale}/dashboard/new-order` 
      : `/${locale}/dashboard/add-funds`;
    
    router.push(targetUrl);
  }

  if (!visible || !recoveryData) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-500">
      <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/10 shadow-2xl relative overflow-hidden">
        {/* Dekoratif blur arka plan */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/20 rounded-full blur-xl" />
        
        <CardContent className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Gift size={16} />
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] font-bold tracking-wider">
                {isTr ? "Sana Özel Teklif" : "Special Offer"}
              </Badge>
            </div>
            <button 
              onClick={() => setVisible(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-sm leading-snug">
              {isTr 
                ? "Yarım Kalan İşlemini Büyütmeye Dönüştür!" 
                : "Convert Your Half-Finished Action!"}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isTr 
                ? "Siparişinizi veya bakiye yükleme işleminizi tamamlamanız için size özel indirim kuponu tanımladık."
                : "We have assigned a custom discount coupon to help you complete your order or add funds."}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center">
            <div>
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider block">{isTr ? "Kupon Kodu" : "Coupon Code"}</span>
              <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-400">
                {recoveryData.couponCode}
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                navigator.clipboard.writeText(recoveryData.couponCode);
                toast.success(isTr ? "Kopyalandı!" : "Copied!");
              }}
              className="glass p-2 h-8"
            >
              <Copy size={12} />
            </Button>
          </div>

          <Button 
            onClick={handleClaim}
            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-primary/20"
          >
            {isTr ? "Kuponu Al & Tamamla" : "Claim & Complete"} <ArrowRight size={12} />
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
