"use client";

import { useState } from "react";
import Script from "next/script";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Flame,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { getPlatformLinkPlaceholder, isCustomCommentServiceType } from "@/lib/platform-utils";
import { CRYPTOMUS_MINIMUM_TL } from "@/lib/payment-minimums";

const COMMISSION_RATE = 0.05;

export type ComboItem = { serviceId: string; quantity: number; label: string };
type ComboAllocationDraft = { target: string; quantity: number };
type CheckoutCustomer =
  | { authenticated: false; paymentMethods?: { paytr: boolean; iyzico: boolean; cryptomus: boolean } }
  | { authenticated: true; name: string | null; email: string | null; phone: string | null; paymentMethods?: { paytr: boolean; iyzico: boolean; cryptomus: boolean } };

export type MarketingPackage = {
  id: string;
  name: string;
  serviceId?: string | null;
  quantity: number;
  retailPrice: number | null;
  price: number;
  description: string | null;
  platformName?: string | null;
  categoryName?: string | null;
  comboItems?: ComboItem[] | null;
  serviceType?: string | null;
  /** Servis gerçeklerinden türeyen dinamik alanlar (opsiyonel) */
  guarantee?: boolean | null;
  canCancel?: boolean | null;
  speedLabel?: string | null;
  orderCount?: number | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
};

export function PackageShowcase({
  packages,
  platformName,
  categoryName,
  emptyTitle,
  emptyDescription,
  highlightPopular = true,
  totalOrdersLabel,
}: {
  packages: MarketingPackage[];
  platformName?: string;
  categoryName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  highlightPopular?: boolean;
  /** Gerçek tamamlanan sipariş sayısından türeyen güven ibaresi (opsiyonel) */
  totalOrdersLabel?: string | null;
}) {
  const [selectedPackage, setSelectedPackage] = useState<MarketingPackage | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState("");
  const [customComments, setCustomComments] = useState("");
  const [comboAllocations, setComboAllocations] = useState<Record<string, ComboAllocationDraft[]>>({});
  const [checkoutCustomer, setCheckoutCustomer] = useState<CheckoutCustomer | null>(null);
  const [customerInfoLoading, setCustomerInfoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"PAYTR" | "IYZICO" | "CRYPTOMUS">("CRYPTOMUS");

  // PayTR iFrame akışı — ödeme onaylandıktan sonra PayTR orderId sayfasına yönlendirir
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const { format } = useCurrency();
  const t = useTranslations("packages");

  function getPackageTier(name: string) {
    const value = name.toLowerCase();
    if (value.includes("vip")) return { label: t("mostPopular"), icon: <Crown size={14} /> };
    if (value.includes("premium")) return { label: t("bestValue"), icon: <Star size={14} /> };
    if (value.includes("standard")) return { label: t("bestSeller"), icon: <Flame size={14} /> };
    return { label: null, icon: null };
  }

  function getDefaultComboAllocations(pkg: MarketingPackage) {
    return Object.fromEntries(
      (pkg.comboItems ?? []).map((item) => [
        item.serviceId,
        [{ target: "", quantity: item.quantity }],
      ])
    );
  }

  function getTargetLabel(label: string) {
    const normalized = label.toLocaleLowerCase("tr");
    if (normalized.includes("takip") || normalized.includes("abone") || normalized.includes("üye") || normalized.includes("uye")) {
      return "Kullanıcı adı / profil URL";
    }
    if (normalized.includes("yorum")) return "Yorum yapılacak gönderi URL";
    if (normalized.includes("beğeni") || normalized.includes("begeni")) return "Beğeni gönderilecek post URL";
    if (normalized.includes("izlen") || normalized.includes("reels") || normalized.includes("video")) return "Video / Reels URL";
    return "Hedef link / kullanıcı adı";
  }

  function getAllocatedQuantity(serviceId: string) {
    return (comboAllocations[serviceId] ?? []).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }

  function updateComboAllocation(serviceId: string, index: number, value: Partial<ComboAllocationDraft>) {
    setComboAllocations((current) => ({
      ...current,
      [serviceId]: (current[serviceId] ?? []).map((row, rowIndex) => (
        rowIndex === index ? { ...row, ...value } : row
      )),
    }));
  }

  function addComboAllocation(item: ComboItem) {
    const remaining = item.quantity - getAllocatedQuantity(item.serviceId);
    if (remaining <= 0) return;

    setComboAllocations((current) => ({
      ...current,
      [item.serviceId]: [
        ...(current[item.serviceId] ?? []),
        { target: "", quantity: remaining },
      ],
    }));
  }

  function removeComboAllocation(item: ComboItem, index: number) {
    setComboAllocations((current) => {
      const rows = current[item.serviceId] ?? [];
      const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
      return {
        ...current,
        [item.serviceId]: nextRows.length > 0 ? nextRows : [{ target: "", quantity: item.quantity }],
      };
    });
  }

  async function loadCheckoutCustomer() {
    setCustomerInfoLoading(true);
    try {
      const res = await fetch("/api/checkout/customer", { cache: "no-store" });
      const data = (await res.json()) as CheckoutCustomer;
      setCheckoutCustomer(data);

      if (data.authenticated) {
        setCustomerName(data.name ?? "");
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
      }

      const methods = data.paymentMethods;
      if (methods) {
        if (methods.paytr) setPaymentMethod("PAYTR");
        else if (methods.iyzico) setPaymentMethod("IYZICO");
        else if (methods.cryptomus) setPaymentMethod("CRYPTOMUS");
      }
    } catch {
      setCheckoutCustomer({ authenticated: false });
    } finally {
      setCustomerInfoLoading(false);
    }
  }

  function openOrderModal(pkg: MarketingPackage) {
    setSelectedPackage(pkg);
    setComboAllocations(getDefaultComboAllocations(pkg));
    setCheckoutCustomer(null);
    void loadCheckoutCustomer();
    setIsOrderModalOpen(true);
    setPaytrToken(null);
    setCurrentOrderId(null);
    setDetailsExpanded(false);
    setCustomComments("");
  }

  function handleClose() {
    setIsOrderModalOpen(false);
    setPaytrToken(null);
    setCurrentOrderId(null);
    setSelectedPackage(null);
    setCustomerName("");
    setEmail("");
    setPhone("");
    setLink("");
    setCustomComments("");
    setComboAllocations({});
    setCheckoutCustomer(null);
    setCustomerInfoLoading(false);
  }

  async function handleOrder() {
    if (!selectedPackage) return;

    const isCombo = Boolean(selectedPackage.comboItems?.length);
    const isCustomPkgComments = isCustomCommentServiceType({
      serviceType: selectedPackage.serviceType,
      name: selectedPackage.name,
      categoryName: selectedPackage.categoryName ?? categoryName,
      parentCategoryName: selectedPackage.platformName ?? platformName,
    });
    const isAuthenticated = checkoutCustomer?.authenticated === true;
    const phoneRequired = !isAuthenticated || (isAuthenticated && !checkoutCustomer.phone);

    const commentLines = customComments.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    if ((!isAuthenticated && (!customerName.trim() || !email.trim())) || (phoneRequired && !phone.trim())) {
      toast.error(t("requiredFields"));
      return;
    }

    if (!isCombo && !link.trim()) {
      toast.error(t("requiredFields"));
      return;
    }

    if (isCustomPkgComments && commentLines.length < 1) {
      toast.error("En az 1 yorum satırı girilmeli.");
      return;
    }

    if (isCustomPkgComments && commentLines.length !== selectedPackage.quantity) {
      toast.error(`Bu paket için tam ${selectedPackage.quantity.toLocaleString("tr-TR")} yorum satırı girmelisiniz.`);
      return;
    }

    // Kart sağlayıcıları kapalıyken kripto minimumunun altındaki paket satılamaz.
    if (effectivePaymentMethod === "CRYPTOMUS" && cryptomusBelowMinimum) {
      toast.error(`Kripto ödeme en az ${CRYPTOMUS_MINIMUM_TL.toLocaleString("tr-TR")} TL siparişlerde kullanılabilir. Lütfen daha büyük bir paket seçin.`);
      return;
    }

    const comboPayload: Array<{ serviceId: string; target: string; quantity: number }> = [];

    if (isCombo) {
      for (const item of selectedPackage.comboItems ?? []) {
        const rows = comboAllocations[item.serviceId] ?? [];
        const filledRows = rows
          .map((row) => ({ target: row.target.trim(), quantity: Math.floor(Number(row.quantity) || 0) }))
          .filter((row) => row.target || row.quantity > 0);
        const totalQuantity = filledRows.reduce((sum, row) => sum + row.quantity, 0);

        if (filledRows.some((row) => !row.target || row.quantity <= 0)) {
          toast.error(`${item.label}: hedef ve miktar bilgilerini tamamlayın.`);
          return;
        }

        if (totalQuantity !== item.quantity) {
          toast.error(`${item.label}: toplam miktar ${item.quantity.toLocaleString("tr-TR")} olmalı.`);
          return;
        }

        comboPayload.push(...filledRows.map((row) => ({
          serviceId: item.serviceId,
          target: row.target,
          quantity: row.quantity,
        })));
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/retail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId:    selectedPackage.id,
          customerName: isAuthenticated ? undefined : customerName.trim(),
          email:        isAuthenticated ? undefined : email.trim(),
          link:         isCombo ? undefined : link.trim(),
          comboAllocations: isCombo ? comboPayload : undefined,
          comments:     isCustomPkgComments ? commentLines.join("\n") : undefined,
          phone:        phoneRequired ? phone.trim() : undefined,
          paymentMethod: effectivePaymentMethod,
        }),
      });

      const data = (await res.json()) as { 
        token?: string; 
        paymentPageUrl?: string; 
        url?: string; 
        paymentId?: string; 
        shortId?: string; 
        error?: string 
      };

      if (!res.ok || !data.paymentId) {
        toast.error(data.error ?? t("paymentError"));
        return;
      }

      localStorage.setItem("last_payment_info", JSON.stringify({
        id: data.paymentId,
        amount: Number(selectedPackage.retailPrice ?? selectedPackage.price) * (1 + COMMISSION_RATE),
        currency: "TRY"
      }));

      if (effectivePaymentMethod === "PAYTR") {
        if (!data.token) {
          toast.error(t("paymentError"));
          return;
        }
        setCurrentOrderId(data.paymentId);
        setPaytrToken(data.token);
      } else if (effectivePaymentMethod === "IYZICO") {
        if (!data.paymentPageUrl) {
          toast.error("iyzico ödeme sayfası oluşturulamadı.");
          return;
        }
        window.location.href = data.paymentPageUrl;
      } else if (effectivePaymentMethod === "CRYPTOMUS") {
        if (!data.url) {
          toast.error("Kripto ödeme adresi oluşturulamadı.");
          return;
        }
        window.location.href = data.url;
      }
    } catch {
      toast.error(t("connectionError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (packages.length === 0) {
    return (
      <Card className="border-dashed border-white/10 shadow-none">
        <CardContent className="p-10 text-center">
          <Sparkles size={32} className="mx-auto text-muted-foreground/30" />
          <p className="mt-4 text-lg font-semibold">{emptyTitle ?? t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{emptyDescription ?? t("emptyDesc")}</p>
        </CardContent>
      </Card>
    );
  }

  const customerIsAuthenticated = checkoutCustomer?.authenticated === true;
  const phoneNeeded = !customerIsAuthenticated || (customerIsAuthenticated && !checkoutCustomer.phone);
  const resolvedPlatform = selectedPackage?.platformName ?? platformName;
  const linkPlaceholder = getPlatformLinkPlaceholder(resolvedPlatform);
  // Cryptomus küçük faturaları reddettiği için seçili paket minimumun altındaysa
  // butonu baştan kapatıp kartı yönlendiriyoruz.
  const selectedPackageTotal =
    Number(selectedPackage?.retailPrice ?? selectedPackage?.price ?? 0) * (1 + COMMISSION_RATE);
  const cryptomusBelowMinimum = Boolean(selectedPackage) && selectedPackageTotal < CRYPTOMUS_MINIMUM_TL;
  // Kripto minimumun altında yalnızca kart (PayTR) gerçekten açıksa karta düş; kapalıysa satış engellenir.
  const paytrAvailable = checkoutCustomer?.paymentMethods?.paytr === true;
  const effectivePaymentMethod =
    paymentMethod === "CRYPTOMUS" && cryptomusBelowMinimum && paytrAvailable ? "PAYTR" : paymentMethod;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {packages.map((pkg, idx) => {
          const totalPrice = pkg.retailPrice ?? pkg.price;
          const isCurrentLoading = submitting && selectedPackage?.id === pkg.id;
          const tier = getPackageTier(pkg.name);
          const isPopular = highlightPopular && idx === packages.length - 1;
          const resolvedPlatformName = pkg.platformName ?? platformName;
          const resolvedCategoryName = pkg.categoryName ?? categoryName;
          const featureLines = pkg.description?.split("\n").filter(Boolean).slice(0, 5) ?? [];

          return (
            <Card
              key={pkg.id}
              className={`group relative overflow-hidden border-border/70 bg-card shadow-lg shadow-black/5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-2xl hover:shadow-primary/10 ${
                isPopular ? "ring-2 ring-primary/45" : ""
              }`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-cyan-400 opacity-80" />
              {isPopular && (
                <div className="absolute right-0 top-0 z-10 rounded-bl-xl bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/25">
                  {t("mostPopular")}
                </div>
              )}

              <CardHeader className="pb-3 pt-5">
                <div className="mb-2 flex flex-wrap items-center gap-2 pr-16">
                  {resolvedPlatformName ? <Badge variant="outline" className="bg-background/70 text-[11px] font-semibold">{resolvedPlatformName}</Badge> : null}
                  {resolvedCategoryName ? <Badge variant="secondary" className="text-[11px] font-semibold">{resolvedCategoryName}</Badge> : null}
                  {tier.label && !isPopular ? (
                    <Badge variant="secondary" className="gap-1 text-[11px] font-semibold">
                      {tier.icon} {tier.label}
                    </Badge>
                  ) : null}
                  {pkg.guarantee === true ? (
                    <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck size={12} /> Garantili
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="text-lg font-extrabold leading-snug text-foreground sm:text-xl">{pkg.name}</CardTitle>
                {pkg.speedLabel || (pkg.orderCount ?? 0) > 0 ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
                    {pkg.speedLabel ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Zap size={12} /> {pkg.speedLabel}
                      </span>
                    ) : null}
                    {(pkg.orderCount ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <ShoppingCart size={12} /> {(pkg.orderCount ?? 0).toLocaleString("tr-TR")}+ sipariş
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4 shadow-inner">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("packagePrice")}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight text-primary sm:text-4xl whitespace-nowrap">{format(totalPrice)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pkg.comboItems && pkg.comboItems.length > 0
                      ? t("comboPayment")
                      : t("oneTimePayment", { qty: pkg.quantity.toLocaleString() })}
                  </p>
                </div>

                <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                  {pkg.comboItems && pkg.comboItems.length > 0 ? (
                    pkg.comboItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                        <span className="font-medium text-foreground/85">{item.label}</span>
                      </div>
                    ))
                  ) : featureLines.length > 0 ? (
                    featureLines.map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                        <span className="font-medium text-foreground/80">{line}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" /> <span className="font-medium text-foreground/80">{t("fastDelivery")}</span>
                      </div>
                      {pkg.guarantee === true ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="shrink-0 text-emerald-500" /> <span className="font-medium text-foreground/80">{t("guarantee30")}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" /> <span className="font-medium text-foreground/80">{t("support247")}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {pkg.serviceId ? (
                    <FavoriteToggleButton serviceId={pkg.serviceId} className="h-12 w-12 shrink-0 rounded-xl" />
                  ) : null}
                  <Button
                    className="h-12 flex-1 gap-2 rounded-xl text-sm font-extrabold shadow-lg shadow-primary/20 transition-transform group-hover:scale-[1.01]"
                    size="lg"
                    disabled={isCurrentLoading}
                    onClick={() => openOrderModal(pkg)}
                  >
                    {isCurrentLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> {t("processing")}
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} /> {t("orderNow")}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Shield size={14} /> {t("sslProtection")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Zap size={14} /> {t("startsMinutes")}
        </span>
        {totalOrdersLabel ? (
          <span className="inline-flex items-center gap-1.5">
            <Star size={14} /> {totalOrdersLabel}
          </span>
        ) : null}
      </div>

      {/* ─── Sipariş Modalı ─────────────────────────────────────────── */}
      <Dialog open={isOrderModalOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogPortal>
          <DialogOverlay />

          {/* ── Mobil: bottom sheet | Masaüstü: ortalı dialog ── */}
          <DialogPrimitive.Popup
            className={[
              // Temel
              "fixed z-50 bg-card text-foreground outline-none overflow-hidden flex flex-col",
              // Animasyon
              "data-open:animate-in data-closed:animate-out data-closed:fade-out-0",
              // MOBİL: tam genişlik, alttan yukarı slide, maxHeight dvh
              "inset-x-0 bottom-0 rounded-t-2xl max-h-[96dvh]",
              "data-open:slide-in-from-bottom data-closed:slide-out-to-bottom duration-300",
              // MASAÜSTÜ (md+): ortalı dialog, sabit genişlik
              "md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
              "md:rounded-2xl md:max-h-[88vh] md:w-full md:max-w-3xl",
              "md:ring-1 md:ring-border",
              "md:data-open:zoom-in-95 md:data-closed:zoom-out-95 md:data-open:slide-in-from-bottom-0",
            ].join(" ")}
          >
            {/* Gizli erişilebilirlik başlıkları */}
            <DialogTitle className="sr-only">{t("orderTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("orderTitle")}</DialogDescription>

            {paytrToken ? (
              /* ── PayTR Ödeme iFrame ── */
              <div className="flex flex-col flex-1 min-h-0">
                <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
                  {/* Mobil drag handle */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/20 md:hidden" />
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard size={15} className="text-primary" /> {t("securePayment")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaytrToken(null)}
                    aria-label="Ödeme sayfasını kapat"
                    className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-auto">
                  <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
                  <iframe
                    src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
                    id="paytriframe"
                    frameBorder={0}
                    scrolling="auto"
                    className="w-full min-h-[750px] block"
                    title="PayTR Güvenli Ödeme"
                    onLoad={() => {
                      if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>)["iFrameResize"]) {
                        (window as unknown as Record<string, (opts: object, sel: string) => void>)["iFrameResize"]({}, "#paytriframe");
                      }
                    }}
                  />
                </div>

                {currentOrderId && (
                  <div className="shrink-0 px-5 py-3 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground">
                      {t("orderNo")}:{" "}
                      <span className="font-mono font-bold text-foreground">
                        #{currentOrderId.slice(-8).toUpperCase()}
                      </span>
                      {" · "}
                      <a
                        href={`/order-tracking?paymentId=${currentOrderId}&status=paid`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {t("orderTrack")} <Search size={11} className="inline" />
                      </a>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* ── Sipariş Formu ── */
              <>
                {/* Mobil drag handle */}
                <div className="md:hidden shrink-0 flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                </div>

                {/* ── MOBİL: Daraltılabilir paket özet çubuğu ── */}
                {selectedPackage && (
                  <div className="md:hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setDetailsExpanded((v) => !v)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                          <ShoppingCart size={15} className="text-primary" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-semibold leading-tight">{selectedPackage.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedPackage.quantity.toLocaleString()} {t("oneTime")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-lg font-extrabold text-primary">
                          {format((selectedPackage.retailPrice ?? selectedPackage.price) * (1 + COMMISSION_RATE))}
                        </span>
                        {detailsExpanded
                          ? <ChevronUp size={16} className="text-muted-foreground" />
                          : <ChevronDown size={16} className="text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {/* Genişletilmiş fiyat detayı */}
                    {detailsExpanded && (
                      <div className="px-5 py-4 bg-muted/10 border-b border-border space-y-2.5">
                        {selectedPackage.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{selectedPackage.description}</p>
                        )}
                        <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>{t("packagePrice")}</span>
                            <span>{format(selectedPackage.retailPrice ?? selectedPackage.price)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>{t("commission")}</span>
                            <span>+{format((selectedPackage.retailPrice ?? selectedPackage.price) * COMMISSION_RATE)}</span>
                          </div>
                          <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
                            <span className="text-xs text-muted-foreground">{t("total")}</span>
                            <span className="text-primary">{format((selectedPackage.retailPrice ?? selectedPackage.price) * (1 + COMMISSION_RATE))}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground"><CheckCircle2 size={12} className="text-green-400" /> {t("fastDeliveryShort")}</span>
                          <span className="flex items-center gap-1 text-muted-foreground"><Shield size={12} className="text-green-400" /> {t("sslSecure")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── MASAÜSTÜ: 2-kolonlu layout ── */}
                <div className="flex flex-col md:flex-row flex-1 min-h-0">

                  {/* Masaüstü sol panel */}
                  <div className="hidden md:flex md:w-72 shrink-0 flex-col justify-between gap-6 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent p-6 border-r border-border">
                    {selectedPackage && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-primary/70">{t("selectedPackage")}</p>
                          <p className="mt-1 text-lg font-bold leading-snug">{selectedPackage.name}</p>
                          {selectedPackage.description && (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-4">{selectedPackage.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(selectedPackage.platformName ?? platformName) && (
                              <Badge variant="outline" className="text-[11px]">{selectedPackage.platformName ?? platformName}</Badge>
                            )}
                            {(selectedPackage.categoryName ?? categoryName) && (
                              <Badge variant="secondary" className="text-[11px]">{selectedPackage.categoryName ?? categoryName}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{t("packagePrice")}</span>
                            <span>{format(selectedPackage.retailPrice ?? selectedPackage.price)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{t("commission")}</span>
                            <span>+{format((selectedPackage.retailPrice ?? selectedPackage.price) * COMMISSION_RATE)}</span>
                          </div>
                          <div className="border-t border-border pt-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">{t("total")}</span>
                            <p className="text-2xl font-extrabold text-primary">{format((selectedPackage.retailPrice ?? selectedPackage.price) * (1 + COMMISSION_RATE))}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{selectedPackage.quantity.toLocaleString()} {t("oneTime")}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-green-400 shrink-0" /> {t("fastDeliveryShort")}</span>
                      {selectedPackage?.guarantee === true ? (
                        <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-green-400 shrink-0" /> {t("guarantee30Short")}</span>
                      ) : null}
                      <span className="flex items-center gap-2"><Shield size={13} className="text-green-400 shrink-0" /> {t("sslSecure")}</span>
                    </div>
                  </div>

                  {/* Form alanı */}
                  <div className="flex flex-col flex-1 min-h-0">
                    {/* Başlık — sadece masaüstünde */}
                    <div className="hidden md:block shrink-0 px-6 pt-5 pb-4 border-b border-border">
                      <p className="flex items-center gap-2 text-base font-semibold">
                        <ShoppingCart size={16} className="text-primary" />
                        {t("orderTitle")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t("orderSubtitle")}</p>
                    </div>

                    {/* Mobil başlık */}
                    <div className="md:hidden shrink-0 px-5 pt-4 pb-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("orderTitle")}</p>
                    </div>

                    {/* Scroll alanı */}
                    <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4 space-y-3.5">
                      {customerInfoLoading ? (
                        <div className="rounded-xl border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground">
                          Hesap bilgileri kontrol ediliyor...
                        </div>
                      ) : customerIsAuthenticated ? (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                          <p className="text-xs font-semibold text-emerald-400">Hesap bilgileriniz kullanılacak</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {checkoutCustomer.name || "Kayıtlı kullanıcı"}
                          </p>
                          <p className="text-xs text-muted-foreground">{checkoutCustomer.email}</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-border bg-card/70 p-4 space-y-3">
                          <div>
                            <p className="text-sm font-extrabold">İletişim bilgileri</p>
                            <p className="text-xs text-muted-foreground">Ödeme ve sipariş takibi için gerekli kısa bilgiler.</p>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="order-customerName" className="text-xs font-medium text-muted-foreground">{t("nameLabel")} <span className="text-destructive">*</span></Label>
                              <Input
                                id="order-customerName"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder={t("namePlaceholder")}
                                className="h-11 bg-background/70 text-base"
                                autoComplete="name"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="order-email" className="text-xs font-medium text-muted-foreground">{t("emailLabel")} <span className="text-destructive">*</span></Label>
                              <Input
                                id="order-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ornek@email.com"
                                type="email"
                                inputMode="email"
                                className="h-11 bg-background/70 text-base"
                                autoComplete="email"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedPackage?.comboItems?.length ? (
                        <div className="space-y-4">
                          {selectedPackage.comboItems.map((item, itemIndex) => {
                            const rows = comboAllocations[item.serviceId] ?? [{ target: "", quantity: item.quantity }];
                            const allocated = getAllocatedQuantity(item.serviceId);
                            const remaining = item.quantity - allocated;

                            return (
                              <div key={item.serviceId} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                                      {itemIndex + 1}
                                    </div>
                                    <div>
                                      <p className="text-sm font-extrabold">{item.label}</p>
                                      <p className="text-xs text-muted-foreground">Toplam hak: {item.quantity.toLocaleString("tr-TR")}</p>
                                    </div>
                                  </div>
                                  <Badge variant={remaining === 0 ? "secondary" : "outline"} className="font-semibold">
                                    Kalan: {remaining.toLocaleString("tr-TR")}
                                  </Badge>
                                </div>

                                <div className="space-y-2.5">
                                  {rows.map((row, rowIndex) => (
                                    <div key={`${item.serviceId}-${rowIndex}`} className="grid gap-2 md:grid-cols-[1fr_120px_36px]">
                                      <Input
                                        value={row.target}
                                        onChange={(e) => updateComboAllocation(item.serviceId, rowIndex, { target: e.target.value })}
                                        placeholder={getTargetLabel(item.label)}
                                        className="h-11 bg-background/70 text-base"
                                      />
                                      <Input
                                        value={row.quantity || ""}
                                        onChange={(e) => updateComboAllocation(item.serviceId, rowIndex, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                        type="number"
                                        min={1}
                                        max={item.quantity}
                                        inputMode="numeric"
                                        className="h-11 bg-background/70 text-base font-bold"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-11 w-full md:w-9"
                                        onClick={() => removeComboAllocation(item, rowIndex)}
                                        aria-label="Hedefi kaldır"
                                      >
                                        <Trash2 size={15} />
                                      </Button>
                                    </div>
                                  ))}
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-3 gap-2"
                                  disabled={remaining <= 0}
                                  onClick={() => addComboAllocation(item)}
                                >
                                  <Plus size={14} /> Hedef ekle
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : isCustomCommentServiceType(selectedPackage ? {
                        serviceType: selectedPackage.serviceType,
                        name: selectedPackage.name,
                        categoryName: selectedPackage.categoryName ?? categoryName,
                        parentCategoryName: selectedPackage.platformName ?? platformName,
                      } : null) ? (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="order-link" className="text-xs font-medium text-muted-foreground">{t("linkLabel")} <span className="text-destructive">*</span></Label>
                            <Input
                              id="order-link"
                              value={link}
                              onChange={(e) => setLink(e.target.value)}
                              placeholder={linkPlaceholder}
                              type="url"
                              inputMode="url"
                              className="h-11 bg-background/70 text-base"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <MessageCircle size={12} className="text-primary" />
                                Özel Yorumlar <span className="text-destructive">*</span>
                              </Label>
                              {customComments.split("\n").filter(l => l.trim()).length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {customComments.split("\n").filter(l => l.trim()).length} yorum
                                </span>
                              )}
                            </div>
                            <textarea
                              value={customComments}
                              onChange={(e) => setCustomComments(e.target.value)}
                              rows={5}
                              placeholder={"Güzel fotoğraf!\nHarika içerik, beğendim\nÇok iyi görünüyor 👏\n..."}
                              className="w-full resize-y rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                            <p className="text-xs text-muted-foreground">
                              Her satır = 1 yorum · Bu paket için {(selectedPackage?.quantity ?? 0).toLocaleString("tr-TR")} yorum satırı girin
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          <Label htmlFor="order-link" className="text-xs font-medium text-muted-foreground">{t("linkLabel")} <span className="text-destructive">*</span></Label>
                          <Input
                            id="order-link"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder={linkPlaceholder}
                            type="url"
                            inputMode="url"
                            className="h-11 bg-background/70 text-base"
                          />
                        </div>
                      )}

                      {phoneNeeded && (
                        <div className="space-y-1.5">
                          <Label htmlFor="order-phone" className="text-xs font-medium text-muted-foreground">
                            {t("phoneLabel")} <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="order-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+90 555 000 0000"
                            type="tel"
                            inputMode="tel"
                            className="h-11 bg-background/70 text-base"
                            autoComplete="tel"
                          />
                          {customerIsAuthenticated && (
                            <p className="text-xs text-muted-foreground">Telefon profilinizde yok; ödeme için bir kez kaydedilecek.</p>
                          )}
                        </div>
                      )}

                      <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                        <p className="text-xs font-semibold text-primary">{customerIsAuthenticated ? "Hızlı ödeme" : t("noAccountNeeded")}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {customerIsAuthenticated
                            ? "Kayıtlı bilgilerinizle devam edilecek; ekstra hesap bilgisi istemiyoruz."
                            : t("noAccountDesc")}
                        </p>
                      </div>

                      {/* Ödeme Yöntemi Seçimi */}
                      {checkoutCustomer?.paymentMethods && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Ödeme Yöntemi
                          </Label>
                          <div className="grid grid-cols-3 gap-2">
                            {checkoutCustomer.paymentMethods.paytr && (
                              <button
                                type="button"
                                onClick={() => setPaymentMethod("PAYTR")}
                                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                                  paymentMethod === "PAYTR"
                                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                                    : "border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Kredi Kartı (PayTR)
                              </button>
                            )}
                            {checkoutCustomer.paymentMethods.iyzico && (
                              <button
                                type="button"
                                onClick={() => setPaymentMethod("IYZICO")}
                                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                                  paymentMethod === "IYZICO"
                                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                                    : "border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Kredi Kartı (iyzico)
                              </button>
                            )}
                            {checkoutCustomer.paymentMethods.cryptomus && (
                              <button
                                type="button"
                                onClick={() => { if (!cryptomusBelowMinimum) setPaymentMethod("CRYPTOMUS"); }}
                                disabled={cryptomusBelowMinimum}
                                title={cryptomusBelowMinimum ? `Kripto ödeme en az ${CRYPTOMUS_MINIMUM_TL} TL siparişlerde kullanılabilir` : undefined}
                                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                                  cryptomusBelowMinimum
                                    ? "border-border bg-muted/40 text-muted-foreground/50 cursor-not-allowed"
                                    : paymentMethod === "CRYPTOMUS"
                                      ? "border-primary bg-primary/5 text-primary shadow-sm cursor-pointer"
                                      : "border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                }`}
                              >
                                Kripto Para
                                {cryptomusBelowMinimum && (
                                  <span className="mt-0.5 block text-[9px] font-medium text-muted-foreground">
                                    min. {CRYPTOMUS_MINIMUM_TL} ₺
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Masaüstünde ekstra güven rozetleri */}
                      <div className="hidden md:flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Shield size={13} className="text-green-400" /> {t("sslProtection")}</span>
                        <span className="inline-flex items-center gap-1.5"><Zap size={13} className="text-yellow-400" /> {t("startsMinutes")}</span>
                      </div>
                    </div>

                    {/* Sticky footer */}
                    <div className="shrink-0 flex flex-col gap-2 border-t border-border px-5 md:px-6 py-4 bg-card">
                      <Button
                        type="button"
                        size="lg"
                        className="h-12 w-full gap-2 text-base font-bold"
                        disabled={submitting || customerInfoLoading}
                        onClick={() => void handleOrder()}
                      >
                        {submitting ? (
                          <><Loader2 className="animate-spin" size={18} /> {t("preparing")}</>
                        ) : (
                          <><CreditCard size={18} /> {format((selectedPackage?.retailPrice ?? selectedPackage?.price ?? 0) * (1 + COMMISSION_RATE))} {t("pay")}</>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 w-full text-muted-foreground hover:text-foreground"
                        onClick={handleClose}
                        disabled={submitting}
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
