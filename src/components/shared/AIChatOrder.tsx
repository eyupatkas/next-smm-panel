"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Send, Bot, User as UserIcon, Wallet, CreditCard, RefreshCw, AlertCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

type Message = {
  role: "user" | "assistant";
  content: string;
  paymentInfo?: {
    serviceId: string;
    link: string;
    quantity: number;
    amount: number;
    serviceName: string;
  };
  paytrToken?: string;
  paymentUrl?: string;
  successOrder?: boolean;
  suggestedPackages?: any[];
  orderMetadata?: {
    orderId: string;
    serviceName: string;
    charge: number;
    quantity: number;
  };
};

export function AIChatOrder({ onChatActiveChange }: { onChatActiveChange?: (active: boolean) => void }) {
  const { data: session } = useSession();
  const locale = useLocale();
  const t = useTranslations("aiChat");
  const { format: fp } = useCurrency();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ziyaretçi hafızasında yarış durumunu (initial empty wipeout) engellemek için ref
  const hasLoadedFromStore = useRef(false);

  // Misafir kullanıcı bilgileri formu için state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState<string | null>(null);

  // Seçili paket hızlı sipariş form states
  const [selectedPackageForOrder, setSelectedPackageForOrder] = useState<{
    msgIndex: number;
    pkgId: string;
    name: string;
    min: number;
    max: number;
    pricePerThousand: number;
  } | null>(null);
  const [inlineLink, setInlineLink] = useState("");
  const [inlineQuantity, setInlineQuantity] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hydration kontrolü ve localStorage'dan ilk yükleme
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("optismm_ai_chat");
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored chat:", e);
      }
    }
    hasLoadedFromStore.current = true;
  }, []);

  // Mesajlar güncellendikçe localStorage'a kaydet (ilk yükleme bitmeden kaydetme/temizleme yapma)
  useEffect(() => {
    if (!mounted || !hasLoadedFromStore.current) return;
    if (messages.length > 0) {
      localStorage.setItem("optismm_ai_chat", JSON.stringify(messages));
    } else {
      localStorage.removeItem("optismm_ai_chat");
    }
  }, [messages, mounted]);

  // Gövde (body) scroll kilidi: Sohbet açıkken arka sayfayı kilitle
  useEffect(() => {
    if (messages.length > 0) {
      document.body.style.overflow = "hidden";
      if (onChatActiveChange) onChatActiveChange(true);
    } else {
      document.body.style.overflow = "";
      if (onChatActiveChange) onChatActiveChange(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [messages.length, onChatActiveChange]);

  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (hasInteracted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, hasInteracted]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setHasInteracted(true);
    setError(null);
    setLoading(true);
    setInputValue("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    try {
      const history = newMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let visitorId = typeof window !== "undefined" ? localStorage.getItem("optismm_visitor_id") : null;
      if (typeof window !== "undefined" && !visitorId) {
        visitorId = "visitor_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("optismm_visitor_id", visitorId);
      }

      const res = await fetch("/api/dashboard/ai-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, visitorId, locale }),
      });

      if (!res.ok) {
        throw new Error("Yapay zeka yanıt veremedi.");
      }

      const data = await res.json();
      
      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply,
        suggestedPackages: data.suggestedPackages,
      };

      if (data.action === "PAYMENT_REQUIRED" && data.metadata) {
        assistantMsg.paymentInfo = data.metadata;
      }

      if (data.action === "ORDER_COMPLETED" && data.metadata) {
        assistantMsg.successOrder = true;
        assistantMsg.orderMetadata = data.metadata;
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setSelectedPackageForOrder(null);
    setError(null);
    if (onChatActiveChange) {
      onChatActiveChange(false);
    }
  };

  const handlePayTRCheckout = async (msgIndex: number, info: Message["paymentInfo"]) => {
    if (!info) return;
    setSubmittingPayment(msgIndex.toString());
    setError(null);

    try {
      let res;
      if (session?.user) {
        res = await fetch("/api/checkout/dashboard-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "single",
            serviceId: info.serviceId,
            quantity: info.quantity,
            link: info.link,
            placedByAgent: true,
          }),
        });
      } else {
        if (!guestName || !guestEmail || !guestPhone) {
          throw new Error("Lütfen ad, e-posta ve telefon bilgilerinizi eksiksiz girin.");
        }
        res = await fetch("/api/checkout/retail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: info.serviceId,
            quantity: info.quantity,
            link: info.link,
            customerName: guestName,
            email: guestEmail,
            phone: guestPhone,
            placedByAgent: true,
            paymentMethod: "CRYPTOMUS",
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Ödeme başlatılamadı.");
      }

      setMessages((prev) => {
        const copy = [...prev];
        copy[msgIndex] = {
          ...copy[msgIndex],
          paytrToken: data.token,
          paymentUrl: data.url,
        };
        return copy;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödeme tokenı oluşturulurken hata.");
    } finally {
      setSubmittingPayment(null);
    }
  };

  function renderFormattedMessage(content: string) {
    if (!content) return null;
    const lines = content.split("\n");

    return lines.map((line, idx) => {
      const isListItem = line.trim().startsWith("•") || line.trim().startsWith("-") || /^\d+\./.test(line.trim());
      let cleanLine = line;
      if (isListItem) {
        cleanLine = line.replace(/^[•\-\d+\.]\s*/, "");
      }

      const parts = cleanLine.split(/\*\*([^*]+)\*\*/g);
      const formattedParts = parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            <strong key={i} className="text-violet-400 font-semibold">
              {part}
            </strong>
          );
        }
        return part;
      });

      if (isListItem) {
        return (
          <div key={idx} className="flex items-start space-x-2 my-1 text-slate-300">
            <span className="text-violet-400 font-bold shrink-0 mt-1">✦</span>
            <span>{formattedParts}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="my-1 min-h-[0.5rem]">
          {formattedParts}
        </p>
      );
    });
  }

  const startSuggestions = [
    t("suggestion1"),
    t("suggestion2"),
    t("suggestion3"),
  ];

  const isChatOpen = messages.length > 0;

  const chatContent = (
    <div
      className={cn(
        "w-full h-full flex flex-col overflow-hidden",
        isChatOpen
          ? "w-full h-full bg-card/50 border border-border rounded-none sm:rounded-2xl shadow-2xl"
          : ""
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-card border-b border-border shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-violet-600/20 text-violet-400 rounded-lg">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{t("title")}</h3>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {session?.user && (
            <div className="hidden sm:flex items-center space-x-2 text-xs bg-muted px-3 py-1.5 rounded-full text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 text-violet-400" />
              <span>{t("balance", { balance: fp((session.user as any).balance ?? 0) })}</span>
            </div>
          )}
          {isChatOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetChat}
              className="text-xs border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center space-x-1"
            >
              <X className="h-4 w-4 text-rose-450" />
              <span>{t("close")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mesaj Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
            <div className="p-4 bg-violet-600/10 text-violet-400 rounded-2xl animate-bounce">
              <Bot className="h-10 w-10" />
            </div>
            <div className="max-w-md space-y-2">
              <h4 className="text-foreground font-medium">{t("welcomeTitle")}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("welcomeDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 max-w-sm w-full">
              {startSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(s)}
                  className="text-left text-xs bg-card hover:bg-muted border border-border text-foreground p-3 rounded-xl transition duration-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          // Başarılı siparişlerde metinsel çift tablo gösterimini engellemek için temizlik
          let displayContent = msg.content;
          if (msg.orderMetadata) {
            displayContent = displayContent
              .split("\n")
              .filter((line) => {
                const cleanLine = line.trim();
                if (cleanLine.startsWith("|") || cleanLine.endsWith("|")) return false;
                if (cleanLine.startsWith("|-") || cleanLine.includes("---|")) return false;
                if (
                  cleanLine.toLowerCase().includes("sipariş id") ||
                  cleanLine.toLowerCase().includes("servis") ||
                  cleanLine.toLowerCase().includes("miktar") ||
                  cleanLine.toLowerCase().includes("kalan bakiye") ||
                  cleanLine.toLowerCase().includes("ücret") ||
                  cleanLine.toLowerCase().includes("link")
                ) {
                  return false;
                }
                return true;
              })
              .join("\n")
              .trim();
          }

          return (
            <div
              key={idx}
              className={`flex items-start space-x-2 sm:space-x-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="p-1.5 sm:p-2 bg-violet-600/20 text-violet-400 rounded-lg shrink-0">
                  <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[90%] sm:max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-br-none"
                    : "bg-card border border-border text-foreground rounded-bl-none shadow-sm"
                )}
              >
                <div>{renderFormattedMessage(displayContent)}</div>

                {/* Tıklanabilir Paket Öneri Kartları */}
                {msg.suggestedPackages && msg.suggestedPackages.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    <p className="text-[11px] font-bold text-violet-400 mb-2">
                      {t("selectPackage")}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.suggestedPackages.map((pkg) => {
                        const isSelected =
                          selectedPackageForOrder?.pkgId === pkg.serviceId &&
                          selectedPackageForOrder?.msgIndex === idx;

                        const avgMin = pkg.avgCompletionMinutes;
                        const isFast = avgMin && avgMin <= 600; // <= 10 saat ise hızlı
                        const hoursText = avgMin
                          ? avgMin < 60
                            ? t("avgMin", { min: Math.round(avgMin) })
                            : t("avgHour", { hour: Math.round(avgMin / 60) })
                          : null;

                        return (
                          <div key={pkg.serviceId} className="space-y-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPackageForOrder(null);
                                } else {
                                  setSelectedPackageForOrder({
                                    msgIndex: idx,
                                    pkgId: pkg.serviceId,
                                    name: pkg.name,
                                    min: pkg.min,
                                    max: pkg.max,
                                    pricePerThousand: pkg.pricePerThousand,
                                  });
                                  setInlineQuantity(pkg.min);
                                  setInlineLink("");
                                }
                              }}
                              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                                isSelected
                                  ? "bg-violet-600/20 border-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.25)] text-violet-200"
                                  : isFast
                                  ? "bg-muted/60 border-emerald-500/40 hover:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.08)] text-foreground hover:text-primary"
                                  : "bg-muted/60 border-border hover:border-violet-500/50 text-foreground hover:text-primary"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-semibold text-xs">{pkg.name}</span>
                                {isFast && (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    {t("fast")}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between w-full mt-1.5 text-[11px] text-muted-foreground">
                                <span>
                                  Min: {pkg.min} / Max: {pkg.max}
                                  {hoursText && ` · ${hoursText}`}
                                </span>
                                <span className="font-bold text-violet-400">
                                  {fp(pkg.pricePerThousand)} <span className="text-[9px] font-normal text-muted-foreground/60">{t("perThousand")}</span>
                                </span>
                              </div>
                            </button>

                            {/* Seçili Paket İçin Hızlı Sipariş Formu */}
                            {isSelected && (
                              <div className="p-3 bg-muted/80 border border-violet-500/30 rounded-xl space-y-3 animate-fadeIn">
                                <div className="text-[11px] text-muted-foreground font-medium">
                                  {t("orderInfo", { name: pkg.name })}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    placeholder={t("linkPlaceholder")}
                                    value={inlineLink}
                                    onChange={(e) => setInlineLink(e.target.value)}
                                    className="w-full bg-background border border-border focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    placeholder={t("quantityPlaceholder", { min: pkg.min, max: pkg.max })}
                                    value={inlineQuantity || ""}
                                    min={pkg.min}
                                    max={pkg.max}
                                    onChange={(e) => setInlineQuantity(Number(e.target.value))}
                                    className="w-full bg-background border border-border focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                                  />
                                </div>
                                
                                {inlineQuantity > 0 && (
                                  <div className="text-[11px] bg-slate-900 border border-slate-800/60 rounded-lg p-2 text-slate-300 font-medium flex items-center justify-between">
                                    <span>{t("calcTotal")}</span>
                                    <span className="text-emerald-400 font-extrabold">{fp((inlineQuantity / 1000) * pkg.pricePerThousand)}</span>
                                  </div>
                                )}

                                <Button
                                  size="sm"
                                  type="button"
                                  disabled={!inlineLink.trim() || !inlineQuantity || inlineQuantity < pkg.min || inlineQuantity > pkg.max}
                                  onClick={() => {
                                    handleSendMessage(
                                      `Sipariş vermek istiyorum. Servis ID: ${pkg.serviceId}, Miktar: ${inlineQuantity}, Link: ${inlineLink}`
                                    );
                                    setSelectedPackageForOrder(null);
                                  }}
                                  className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-1.5 rounded-lg"
                                >
                                  {t("submitOrder")}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Premium Sipariş Fişi (Invoice) */}
                {msg.orderMetadata && (
                  <div className="mt-4 bg-gradient-to-br from-emerald-50/90 via-background to-emerald-50/50 dark:from-emerald-950/80 dark:via-card/90 dark:to-emerald-950/70 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_rgba(16,185,129,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    {/* Fiş Başlığı */}
                    <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-emerald-500/20">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full animate-pulse">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-emerald-550 dark:text-emerald-400 font-bold">{t("invoiceTitle")}</h4>
                        <p className="text-[9px] text-muted-foreground">{t("invoiceSub")}</p>
                      </div>
                    </div>

                    {/* Fiş Detay Tablosu */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-border/40 pb-1.5">
                        <span className="text-muted-foreground">{t("orderId")}</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-300 font-semibold">#{msg.orderMetadata.orderId}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1.5">
                        <span className="text-muted-foreground">{t("serviceName")}</span>
                        <span className="text-foreground text-right max-w-[200px] truncate">{msg.orderMetadata.serviceName}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1.5">
                        <span className="text-muted-foreground">{t("quantity")}</span>
                        <span className="text-foreground font-semibold">{msg.orderMetadata.quantity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-foreground font-medium">{t("totalAmount")}</span>
                        <span className="text-sm text-emerald-500 dark:text-emerald-400 font-extrabold">{fp(msg.orderMetadata.charge)}</span>
                      </div>
                    </div>

                    {/* İlerleme Çubuğu */}
                    <div className="mt-5 pt-3 border-t border-border/40">
                      <div className="flex justify-between text-[9px] text-muted-foreground mb-1.5">
                        <span>{t("stepReceived")}</span>
                        <span>{t("stepProcessing")}</span>
                        <span>{t("stepCompleting")}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-450 rounded-full" style={{ width: "65%" }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sipariş Tamamlama Detayları */}
                {msg.paymentInfo && !msg.paytrToken && !msg.paymentUrl && (
                  <div className="mt-4 p-4 bg-muted/60 border border-border rounded-xl space-y-4">
                    <div className="flex items-center space-x-2 text-violet-400 font-semibold text-xs">
                      <CreditCard className="h-4 w-4" />
                      <span>{t("securePaymentTitle")}</span>
                    </div>
                    <div className="text-xs space-y-1 text-foreground">
                      <div><strong>{t("serviceLabel")}</strong> {msg.paymentInfo.serviceName}</div>
                      <div><strong>{t("quantityLabel")}</strong> {msg.paymentInfo.quantity}</div>
                      <div><strong>{t("linkLabel")}</strong> {msg.paymentInfo.link}</div>
                      <div className="text-sm text-violet-500 dark:text-violet-300 font-semibold mt-1">
                        {t("paymentAmount", { amount: msg.paymentInfo.amount.toFixed(2) })}
                      </div>
                    </div>

                    {/* Misafir Kullanıcı Formu */}
                    {!session?.user && (
                      <div className="space-y-2 mt-2">
                        <input
                          type="text"
                          placeholder={t("guestNamePlaceholder")}
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                        />
                        <input
                          type="email"
                          placeholder={t("guestEmailPlaceholder")}
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                        />
                        <input
                          type="tel"
                          placeholder={t("guestPhonePlaceholder")}
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                        />
                      </div>
                    )}

                    <Button
                      onClick={() => handlePayTRCheckout(idx, msg.paymentInfo)}
                      disabled={submittingPayment === idx.toString()}
                      className="w-full bg-violet-600 hover:bg-violet-750 text-white font-medium text-xs py-2 rounded-lg transition duration-200"
                    >
                      {submittingPayment === idx.toString() ? (
                        <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                      ) : null}
                      {t("startPaytr")}
                    </Button>
                  </div>
                )}

                {/* Kripto Ödeme Yönlendirmesi */}
                {msg.paymentUrl && (
                  <div className="mt-4 p-4 bg-muted/60 border border-border rounded-xl space-y-3">
                    <div className="flex items-center space-x-2 text-sky-500 font-semibold text-xs">
                      <Wallet className="h-4 w-4" />
                      <span>Kripto (Cryptomus) Ödemesi</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ödemenizi tamamlamak için kripto ödeme sayfasına yönlendiriliyorsunuz.
                    </div>
                    <Button
                      onClick={() => { window.location.href = msg.paymentUrl!; }}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs py-2 rounded-lg transition duration-200"
                    >
                      Kripto İle Ödemeye Geç
                    </Button>
                  </div>
                )}

                {/* PayTR Iframe Yükleme Alanı */}
                {msg.paytrToken && (
                  <div className="mt-4 p-2 bg-muted border border-border rounded-xl overflow-hidden shadow-inner">
                    <iframe
                      src={`https://www.paytr.com/odeme/guvenli/${msg.paytrToken}`}
                      scrolling="auto"
                      className="w-full h-[750px] border-0 rounded-lg"
                      title="PayTR Safe Payment"
                    />
                    <div className="text-center text-[10px] text-muted-foreground mt-2">
                      {t("paytrSecureDesc")}
                    </div>
                  </div>
                )}

                {/* Başarılı Sipariş Rozeti */}
                {msg.successOrder && !msg.orderMetadata && (
                  <div className="mt-3 flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-550 dark:bg-emerald-400 animate-ping" />
                    <span>{t("successOrderDesc")}</span>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="p-2 bg-muted text-muted-foreground rounded-lg shrink-0">
                  <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-violet-600/20 text-violet-400 rounded-lg animate-pulse shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-card border border-border text-muted-foreground px-4 py-3 rounded-2xl rounded-bl-none flex items-center space-x-2 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-xs mx-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Alanı */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className={cn(
          "bg-card border-t border-border flex items-center space-x-2 shrink-0 pb-safe",
          isChatOpen ? "p-4 sm:p-6" : "p-4"
        )}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="flex-1 bg-background border border-border focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none transition duration-200"
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="bg-violet-600 hover:bg-violet-750 text-white rounded-xl p-2.5 sm:p-3 transition duration-200 flex items-center justify-center shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );

  const wrapperClass = cn(
    "transition-all duration-300 ease-in-out",
    isChatOpen
      ? "fixed inset-0 w-screen h-[100dvh] z-[9999] bg-background/98 backdrop-blur-2xl flex flex-col p-0 sm:p-4 md:p-6 lg:p-8 animate-fadeIn"
      : "flex flex-col h-[600px] bg-background/80 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-2xl w-full"
  );

  if (isChatOpen) {
    if (!mounted) return null;
    return createPortal(
      <div className={wrapperClass}>
        {chatContent}
      </div>,
      document.body
    );
  }

  return (
    <div className={wrapperClass}>
      {chatContent}
    </div>
  );
}
