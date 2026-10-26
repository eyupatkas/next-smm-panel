"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAbandonedTracker } from "@/lib/hooks/useAbandonedTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayTRIframe } from "@/components/shared/PayTRIframe";
import {
  Loader2,
  CreditCard,
  X,
  ShoppingBag,
  Coins,
  Check,
  Lock,
  ShieldCheck,
  Zap,
  HelpCircle,
  Sparkles,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { Currency } from "@/lib/currency";

interface PayTRIframeProps {
  methods: Array<{ value: string; label: string }>;
  currency: Currency;
  bankAccount: { holder: string; bank: string; iban: string };
}

const PROVIDER_METADATA: Record<
  string,
  {
    titleKey: string;
    descKey: string;
    icon: React.ComponentType<any>;
    badge?: string;
    badgeKey?: string;
    badgeColor?: string;
  }
> = {
  PAYTR: {
    titleKey: "paytrTitle",
    descKey: "paytrDescription",
    icon: CreditCard,
    badgeKey: "popularBadge",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/25",
  },
  IYZICO: {
    titleKey: "iyzicoTitle",
    descKey: "iyzicoDescription",
    icon: CreditCard,
    badgeKey: "secureBadge",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/25",
  },
  SHOPIER: {
    titleKey: "shopierTitle",
    descKey: "shopierDescription",
    icon: ShoppingBag,
  },
  CRYPTOMUS: {
    titleKey: "cryptomusTitle",
    descKey: "cryptomusDescription",
    icon: Coins,
    badgeKey: "cryptoBadge",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
  },
  BANK_TRANSFER: {
    titleKey: "bankTransferTitle",
    descKey: "bankTransferDescription",
    icon: ArrowLeftRight,
    badge: "500 ₺ min.",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
  },
  POLAR: {
    titleKey: "polarTitle",
    descKey: "polarDescription",
    icon: CreditCard,
  },
};

const QUICK_AMOUNTS_BY_CURRENCY: Record<string, number[]> = {
  TRY: [100, 250, 500, 1000],
  USD: [10, 25, 50, 100],
  EUR: [10, 25, 50, 100],
  AZN: [10, 20, 50, 100],
};

export function AddFundsClient({ methods, currency, bankAccount }: PayTRIframeProps) {
  const quickAmounts = QUICK_AMOUNTS_BY_CURRENCY[currency.code] ?? [10, 25, 50, 100];
  const t = useTranslations("addFundsPage");
  const [amount, setAmount] = useState("500");
  const [usdAmount, setUsdAmount] = useState("");
  const [method, setMethod] = useState(methods[0]?.value ?? "PAYTR");
  const [loading, setLoading] = useState(false);
  const [iframeToken, setIframeToken] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [transferReference, setTransferReference] = useState<string | null>(null);

  // Terk edilmiş bakiye yükleme takibi
  const trackerData = useMemo(() => ({
    amount,
    method,
  }), [amount, method]);

  useAbandonedTracker("FUNDS", trackerData);

  useEffect(() => {
    fetch("/api/currency/rates")
      .then((res) => res.json())
      .then((data: { rates: Record<string, number> }) => {
        if (data && data.rates) {
          setRates(data.rates);
        }
      })
      .catch((err) => console.error("Error fetching rates:", err));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      if (status === "success") {
        const stored = localStorage.getItem("last_payment_info");
        if (stored) {
          try {
            const paymentInfo = JSON.parse(stored);
            if (typeof (window as any).gtag === "function") {
              (window as any).gtag("event", "purchase", {
                transaction_id: paymentInfo.id || `DEP-${Date.now()}`,
                value: Number(paymentInfo.amount),
                currency: paymentInfo.currency || "TRY",
                items: [
                  {
                    item_name: "Bakiye Yükleme",
                    price: Number(paymentInfo.amount),
                    quantity: 1,
                  }
                ]
              });
              (window as any).gtag("event", "conversion", {
                send_to: "AW-10832016569/PfY7CML5prscELnpja0o",
                value: Number(paymentInfo.amount),
                currency: paymentInfo.currency || "TRY",
                transaction_id: paymentInfo.id || `DEP-${Date.now()}`
              });
            }
            toast.success(t("paymentSuccess"));
            localStorage.removeItem("last_payment_info");
          } catch (e) {
            console.error("Error parsing last_payment_info:", e);
          }
        }
      }
    }
  }, []);

  const activeRate = rates?.[currency.code] ?? currency.rateFromTRY ?? 1;
  const usdRate = rates?.["USD"] ?? 0.0222;
  const crossRate = usdRate / activeRate; // 1 Active Currency = X USD
  const minAmount = Number((50 * activeRate).toFixed(2));
  const currentMinAmount = Number(((method === "BANK_TRANSFER" ? 500 : 50) * activeRate).toFixed(2));

  // Initialize and update USD amount when base amount or rates change
  useEffect(() => {
    if (amount) {
      const numVal = Number(amount);
      if (Number.isFinite(numVal)) {
        setUsdAmount((numVal * crossRate).toFixed(2));
      }
    }
  }, [rates, crossRate, amount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    if (val === "") {
      setUsdAmount("");
    } else {
      const numVal = Number(val);
      if (Number.isFinite(numVal)) {
        setUsdAmount((numVal * crossRate).toFixed(2));
      }
    }
  };

  const handleUsdAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsdAmount(val);
    if (val === "") {
      setAmount("");
    } else {
      const numVal = Number(val);
      if (Number.isFinite(numVal)) {
        setAmount((numVal / crossRate).toFixed(2));
      }
    }
  };

  const handleQuickAmountClick = (val: number) => {
    setAmount(val.toString());
    setUsdAmount((val * crossRate).toFixed(2));
  };

  const getProviderMeta = (value: string, label: string) => {
    const meta = PROVIDER_METADATA[value];
    if (meta) {
      if (value === "BANK_TRANSFER") {
        return {
          title: "Havale / EFT",
          description: "En az 500 ₺ · Yönetici onayıyla bakiyenize eklenir.",
          icon: meta.icon,
          badge: meta.badge,
          badgeColor: meta.badgeColor,
        };
      }
      let title = label;
      let description = t("subtitle");
      try {
        title = t(meta.titleKey);
        description = t(meta.descKey);
      } catch {
        if (value === "IYZICO") {
          title = "iyzico Kredi Kartı";
          description = "iyzico güvencesiyle 3D Secure kredi veya banka kartı ile ödeme.";
        }
      }

      let badge = undefined;
      if (meta.badgeKey) {
        try {
          badge = t(meta.badgeKey);
        } catch {
          if (value === "IYZICO") {
            badge = "Güvenli";
          }
        }
      }

      return {
        title,
        description,
        icon: meta.icon,
        badge,
        badgeColor: meta.badgeColor,
      };
    }
    return {
      title: label,
      description: t("subtitle"),
      icon: CreditCard,
      badge: undefined,
      badgeColor: undefined,
    };
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    
    // API expects amount in base currency (TRY)
    const amountInTRY = numAmount / activeRate;

    const minimum = method === "BANK_TRANSFER" ? 500 : 50;
    if (!amountInTRY || amountInTRY < minimum) {
      toast.error(`Minimum yükleme tutarı ${minimum} TL.`);
      return;
    }

    setLoading(true);
    try {
      if (method === "BANK_TRANSFER") {
        const res = await fetch("/api/payment/bank-transfer/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInTRY }),
        });
        const data = (await res.json()) as { paymentId?: string; reference?: string; error?: string };
        if (!res.ok || !data.paymentId) {
          toast.error(data.error ?? "Havale talebi oluşturulamadı.");
          return;
        }
        setTransferReference(data.reference ?? data.paymentId);
        toast.success(`Havale talebiniz oluşturuldu. Açıklama: ${data.reference ?? data.paymentId}`);
      } else if (method === "PAYTR") {
        const res = await fetch("/api/payment/paytr/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInTRY }),
        });
        const data = (await res.json()) as { token?: string; error?: string; paymentId?: string };
        if (!res.ok || !data.token) {
          toast.error(data.error ?? t("paytrConnectionError"));
          return;
        }
        localStorage.setItem("last_payment_info", JSON.stringify({
          id: data.paymentId,
          amount: Number(amount),
          currency: currency.code
        }));
        
        setIframeToken(data.token);
      } else if (method === "IYZICO") {
        const res = await fetch("/api/payment/iyzico/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInTRY }),
        });
        const data = (await res.json()) as { paymentPageUrl?: string; error?: string; paymentId?: string };
        if (!res.ok || !data.paymentPageUrl) {
          toast.error(data.error ?? "Ödeme bağlantısı kurulamadı. Lütfen tekrar deneyin.");
          return;
        }
        localStorage.setItem("last_payment_info", JSON.stringify({
          id: data.paymentId,
          amount: Number(amount),
          currency: currency.code
        }));
        window.location.href = data.paymentPageUrl;
      } else if (method === "CRYPTOMUS") {
        const res = await fetch("/api/payment/cryptomus/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInTRY, crypto: "" }),
        });
        const data = (await res.json()) as { url?: string; error?: string; paymentId?: string };
        if (!res.ok || !data.url) {
          toast.error(data.error ?? t("cryptomusConnectionError"));
          return;
        }
        localStorage.setItem("last_payment_info", JSON.stringify({
          id: data.paymentId,
          amount: Number(amount),
          currency: currency.code
        }));
        window.location.href = data.url;
      } else if (method === "POLAR") {
        const res = await fetch("/api/payment/polar/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInTRY }),
        });
        const data = (await res.json()) as { url?: string; error?: string; paymentId?: string };
        if (!res.ok || !data.url) {
          toast.error(data.error ?? "Ödeme bağlantısı kurulamadı. Lütfen tekrar deneyin.");
          return;
        }
        localStorage.setItem("last_payment_info", JSON.stringify({
          id: data.paymentId,
          amount: Number(amount),
          currency: currency.code
        }));
        window.location.href = data.url;
      } else {
        toast.info(t("shopierComingSoon"));
      }
    } catch {
      toast.error(t("generalError"));
    } finally {
      setLoading(false);
    }
  }

  if (iframeToken) {
    return (
      <Card className="border-primary/20 bg-gradient-to-b from-card to-card/60 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40 mb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <CreditCard size={18} className="text-primary animate-pulse" />
            {t("paytrTitle")}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
            onClick={() => setIframeToken(null)}
          >
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[72vh] overflow-auto p-4 pt-0">
            <PayTRIframe token={iframeToken} title="PayTR Ödeme" iframeId="dashboard-add-funds-paytr" minHeight={560} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMeta = getProviderMeta(method, method);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Sol Sütun: Ödeme Formu */}
      <div className="lg:col-span-2">
        <Card className="border-primary/10 bg-gradient-to-b from-card to-card/40 backdrop-blur-md shadow-xl overflow-hidden animate-in fade-in duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Wallet size={20} className="text-primary" />
              {t("title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noMethods")}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Cryptomus seçildiğinde gösterilecek Çift Yönlü Çevirici (TRY <-> USD) */}
                {method === "CRYPTOMUS" ? (
                  <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                      
                      {/* Sol Input: Aktif Para Birimi */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("tutarTry", { currency: currency.code })}
                          </label>
                          <span className="text-[10px] text-muted-foreground">
                            {t("minAmountWarning", { min: minAmount.toFixed(2), currency: currency.code })}
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">
                            {currency.symbol}
                          </span>
                          <input
                            id="amount"
                            name="amount"
                            type="number"
                            min={currentMinAmount}
                            step="0.01"
                            value={amount}
                            onChange={handleAmountChange}
                            className="flex h-12 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-2 text-lg font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all outline-none"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      {/* Değişim İkonu */}
                      <div className="flex justify-center pt-6 md:pt-4 text-primary shrink-0">
                        <div className="p-2.5 rounded-full bg-primary/10 border border-primary/20">
                          <ArrowLeftRight size={18} />
                        </div>
                      </div>

                      {/* Sağ Input: USD */}
                      <div className="space-y-2">
                        <label htmlFor="amount_usd" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("tutarUsd")}
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">
                            $
                          </span>
                          <input
                            id="amount_usd"
                            name="amount_usd"
                            type="number"
                            step="0.01"
                            value={usdAmount}
                            onChange={handleUsdAmountChange}
                            className="flex h-12 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-2 text-lg font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all outline-none"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  /* Standart Tutar Girişi (PayTR/Shopier için) */
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label htmlFor="amount" className="text-sm font-semibold text-foreground">
                        {t("depositAmount")} ({currency.code})
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {method === "BANK_TRANSFER" ? `Minimum 500 ₺ (${currentMinAmount.toFixed(2)} ${currency.code})` : t("minAmountWarning", { min: minAmount.toFixed(2), currency: currency.code })}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">
                        {currency.symbol}
                      </span>
                      <input
                        id="amount"
                        name="amount"
                        type="number"
                        min={currentMinAmount}
                        step="0.01"
                        value={amount}
                        onChange={handleAmountChange}
                        className="flex h-12 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-2 text-lg font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all outline-none"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Hızlı Miktar Seçenekleri */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {quickAmounts.map((val: number) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmountClick(val)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer ${
                        amount === val.toString()
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-[1.03]"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      +{val} {currency.code}
                    </button>
                  ))}
                </div>

                {/* Ödeme Sağlayıcı Seçimi Grid */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">{t("selectPaymentMethod")}</label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {methods.map((m) => {
                      const isSelected = method === m.value;
                      const meta = getProviderMeta(m.value, m.label);
                      const Icon = meta.icon;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMethod(m.value)}
                          className={`relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all duration-300 cursor-pointer group hover:scale-[1.02] ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/30"
                              : "border-border bg-background/40 hover:bg-muted/30 hover:border-border/80"
                          }`}
                        >
                          {/* Onay İkonu */}
                          <div className={`absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full transition-all ${
                            isSelected ? "bg-primary text-primary-foreground scale-100 animate-in zoom-in duration-200" : "border border-muted-foreground/30 scale-90 opacity-0 group-hover:opacity-100"
                          }`}>
                            <Check size={11} className="stroke-[3]" />
                          </div>

                          {/* Üst Rozet */}
                          {meta.badge && (
                            <span className={`absolute -top-2.5 left-4 px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wider ${meta.badgeColor || "bg-muted text-muted-foreground"}`}>
                              {meta.badge}
                            </span>
                          )}

                          <div className={`p-2.5 rounded-lg mb-4 transition-all duration-300 ${
                            isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"
                          }`}>
                            <Icon size={20} />
                          </div>

                          <h3 className="font-bold text-foreground text-sm mb-1">
                            {meta.title}
                          </h3>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {meta.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {method === "BANK_TRANSFER" && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2 text-sm">
                    <p className="font-semibold">Havale / EFT hesap bilgileri</p>
                    <p>{bankAccount.bank} · {bankAccount.holder}</p>
                    <p className="font-mono break-all">IBAN: {bankAccount.iban}</p>
                    <p className="text-xs text-muted-foreground">Talep oluşturduktan sonra transferi yapın ve açıklamaya gösterilen referansı yazın. Bakiye, transfer kontrol edilip yönetici tarafından onaylandığında yüklenir. Minimum tutar 500 ₺.</p>
                    {transferReference && <p className="font-semibold text-emerald-300">Transfer açıklaması: {transferReference}</p>}
                  </div>
                )}

                {/* Buton */}
                <Button type="submit" className="w-full h-12 gap-2 font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/95 rounded-xl transition-all shadow-lg hover:shadow-primary/20 cursor-pointer" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> {t("processing")}</>
                  ) : (
                    <><Lock size={16} /> {t("secureCheckout")}</>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sağ Sütun: Ödeme Özeti & Güvenlik */}
      <div className="space-y-6">
        <Card className="border-primary/10 bg-card/40 backdrop-blur-md shadow-xl animate-in fade-in duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <Sparkles size={18} className="text-primary" />
              {t("summaryTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{t("depositAmount")}</span>
              <span className="font-semibold text-foreground">{Number(amount || 0).toFixed(2)} {currency.code}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{t("method")}</span>
              <span className="font-medium text-foreground">{currentMeta.title}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{t("commission")}</span>
              <span className="font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">{t("freeOfCharge")}</span>
            </div>
            
            <div className="h-[1px] bg-border/40 my-2" />
            
            <div className="flex justify-between items-end pt-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t("totalPayment")}</p>
                <p className="text-[10px] text-muted-foreground/85">{t("vatIncluded")}</p>
              </div>
              <p className="text-2xl font-black text-primary tracking-tight">
                {Number(amount || 0).toFixed(2)} {currency.code}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Güvenlik Rozetleri */}
        <Card className="border-border/60 bg-card/20 backdrop-blur-md shadow-sm animate-in fade-in duration-300">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">{t("sslTitle")}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t("sslDesc")}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <Zap size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">{t("instantDepositTitle")}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t("instantDepositDesc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <HelpCircle size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">{t("supportTitle")}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t("supportDesc")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
