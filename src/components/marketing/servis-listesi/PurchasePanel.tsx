"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Minus,
  Plus,
  ShoppingCart,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { formatPrice, type Currency } from "@/lib/currency";
import { isCustomCommentServiceType } from "@/lib/platform-utils";
import { resolvePayTRMinimum } from "@/lib/paytr-minimum";
import { CRYPTOMUS_MINIMUM_TL } from "@/lib/payment-minimums";
import { calculateClientCharge } from "@/lib/client-pricing";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardPayTRDialog } from "@/components/dashboard/DashboardPayTRDialog";
import type { PayTRIframeResult } from "@/components/shared/PayTRIframe";

export type PurchasePanelService = {
  id: string;
  name: string;
  /** Category name (leaf) */
  categoryName?: string;
  /** Parent category name */
  parentCategoryName?: string;
  min: number;
  max: number;
  unitPrice: number;
  pricingMode?: "PER_THOUSAND" | "PER_UNIT";
  currency: Currency;
  intlLocale: string;
  serviceType?: string | null;
  /** placeholder hint for the link input, computed from platform name */
  linkPlaceholder: string;
};

type Props = {
  service: PurchasePanelService;
  /** Tailwind gradient class (e.g. "from-pink-500 to-purple-600") */
  ctaGradient: string;
  isLoggedIn: boolean;
  userBalance: number;
  /** Where to redirect after successful order */
  successRedirect?: string;
};

type CheckoutResponse = {
  status?: "created" | "payment_required";
  message?: string;
  totalAmount?: number;
  usedBalance?: number;
  remainingAmount?: number;
  paytrAmount?: number;
  paymentCurrency?: string;
  gatewayAmount?: number;
  minimumPaymentApplied?: boolean;
  minimumPaymentOriginalAmount?: number;
  minimumPaymentSurplus?: number;
  token?: string;
  url?: string;
  paymentId?: string;
  cancelToken?: string;
  shortId?: string;
  error?: string;
};

function formatTotal(value: number, currency: Currency, locale: string) {
  return formatPrice(value, currency, locale);
}

export function PurchasePanel({
  service,
  ctaGradient,
  isLoggedIn,
  userBalance,
  successRedirect = "/dashboard/orders",
}: Props) {
  const t = useTranslations("newOrderForm");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [link, setLink] = useState("");
  const [quantityInput, setQuantityInput] = useState(String(service.min));
  const [customComments, setCustomComments] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [retailPaymentId, setRetailPaymentId] = useState<string | null>(null);
  const [retailCancelToken, setRetailCancelToken] = useState<string | null>(null);
  const [paytrResult, setPaytrResult] = useState<PayTRIframeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isCustomComments = isCustomCommentServiceType({
    serviceType: service.serviceType,
    name: service.name,
    categoryName: service.categoryName,
    parentCategoryName: service.parentCategoryName,
  });

  const commentLines = useMemo(
    () => customComments.split("\n").map((l) => l.trim()).filter((l) => l.length > 0),
    [customComments],
  );
  const commentCount = commentLines.length;
  const commentCountValid = commentCount >= service.min && commentCount <= service.max;

  const parsedQuantity = useMemo(() => {
    const normalized = quantityInput.trim();
    if (!normalized) return null;
    if (!/^\d+$/.test(normalized)) return Number.NaN;

    return Number.parseInt(normalized, 10);
  }, [quantityInput]);

  const quantityPreview =
    typeof parsedQuantity === "number" && Number.isFinite(parsedQuantity)
      ? Math.max(0, parsedQuantity)
      : 0;

  const effectiveQty = isCustomComments ? commentCount : quantityPreview;

  const total = useMemo(() => {
    const q = Math.max(0, effectiveQty);
    return calculateClientCharge(service.unitPrice, q, service.pricingMode);
  }, [effectiveQty, service.pricingMode, service.unitPrice]);

  const paymentCommission = useMemo(() => Number((total * 0.05).toFixed(4)), [total]);
  const payableTotal = useMemo(() => Number((total + paymentCommission).toFixed(4)), [paymentCommission, total]);

  const quantityValid =
    typeof parsedQuantity === "number" &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity >= service.min &&
    parsedQuantity <= service.max;

  const linkValid = link.trim().length >= 2;
  const guestInfoValid =
    customerName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phone.trim().length >= 6;
  const orderInputValid = linkValid && (isCustomComments ? commentCountValid : quantityValid);
  const formValid = orderInputValid && (isLoggedIn || guestInfoValid);
  const submitPending = checkoutPending;
  const willUseBalance = useMemo(
    () => Number(Math.min(userBalance, total).toFixed(4)),
    [total, userBalance],
  );
  const remainingForPayTR = useMemo(
    () => Number(Math.max(total - willUseBalance, 0).toFixed(4)),
    [total, willUseBalance],
  );
  const dashboardPayTRMinimum = useMemo(
    () => resolvePayTRMinimum(remainingForPayTR),
    [remainingForPayTR],
  );
  // Kart sağlayıcıları kapalı; misafir ödemeleri Cryptomus üzerinden alınır.
  const guestBelowCryptoMinimum = payableTotal < CRYPTOMUS_MINIMUM_TL;

  function clamp(v: number) {
    if (Number.isNaN(v)) return service.min;
    if (v < service.min) return service.min;
    if (v > service.max) return service.max;
    return Math.floor(v);
  }

  function syncQuantity(nextValue: number) {
    const clamped = clamp(nextValue);
    setQuantityInput(String(clamped));
    if (paytrToken) {
      setPaytrToken(null);
    }
  }

  function handleQuantityChange(rawValue: string) {
    const digitsOnly = rawValue.replace(/\D+/g, "");
    setQuantityInput(digitsOnly);
    if (error) setError(null);
    if (paytrToken) {
      setPaytrToken(null);
    }
  }

  function handleQuantityBlur() {
    if (parsedQuantity === null || Number.isNaN(parsedQuantity)) {
      syncQuantity(service.min);
      return;
    }

    syncQuantity(parsedQuantity);
  }

  async function abandonRetailCheckoutSession(paymentId: string, cancelToken: string) {
    try {
      await fetch("/api/checkout/retail/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, cancelToken }),
      });
    } catch {
      // Kullanıcı deneyimini bozmadan sessizce temizlemeyi deneriz.
    }
  }

  function resetRetailCheckout(options?: { abandonPending?: boolean }) {
    const shouldAbandon = options?.abandonPending ?? false;
    const activePaymentId = retailPaymentId;

    if (shouldAbandon && activePaymentId && retailCancelToken) {
      void abandonRetailCheckoutSession(activePaymentId, retailCancelToken);
    }

    if (paytrToken) {
      setPaytrToken(null);
    }

    if (retailPaymentId) {
      setRetailPaymentId(null);
    }
    if (retailCancelToken) {
      setRetailCancelToken(null);
    }
    if (paytrResult) {
      setPaytrResult(null);
    }

    if (success) setSuccess(null);
    if (error) setError(null);
  }

  function validateOrderInputs() {
    setError(null);
    setSuccess(null);

    if (!linkValid) {
      setError("Lütfen geçerli bir bağlantı veya kullanıcı adı girin.");
      return false;
    }

    if (isCustomComments) {
      if (commentCount < 1) {
        setError("En az 1 yorum satırı giriniz.");
        return false;
      }
      if (!commentCountValid) {
        setError(
          `Yorum sayısı ${service.min.toLocaleString("tr-TR")} ile ${service.max.toLocaleString("tr-TR")} arasında olmalıdır. Şu an: ${commentCount}`,
        );
        return false;
      }
    } else if (!quantityValid) {
      setError(
        `Miktar ${service.min.toLocaleString("tr-TR")} ile ${service.max.toLocaleString("tr-TR")} arasında olmalıdır.`,
      );
      return false;
    }

    return true;
  }

  async function submitGuestCheckout() {
    if (!validateOrderInputs()) {
      return;
    }

    if (!guestInfoValid) {
      setError("Misafir sipariş için ad soyad, e-posta ve telefon bilgilerini doldurun.");
      return;
    }

    if (guestBelowCryptoMinimum) {
      setError(`Kripto para ile ödeme yalnızca ${CRYPTOMUS_MINIMUM_TL.toFixed(2)} TL ve üzeri siparişlerde kullanılabilir. Lütfen miktarı artırın.`);
      return;
    }

    setCheckoutPending(true);

    try {
      const response = await fetch("/api/checkout/retail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          customerName: customerName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          link: link.trim(),
          quantity: effectiveQty,
          comments: isCustomComments ? commentLines.join("\n") : undefined,
          paymentMethod: "CRYPTOMUS",
        }),
      });

      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok || !data.url) {
        setError(data.error ?? "Ödeme ekranı hazırlanamadı.");
        return;
      }

      localStorage.setItem("last_payment_info", JSON.stringify({
        id: data.paymentId,
        amount: payableTotal,
        currency: "TRY"
      }));

      window.location.href = data.url;
    } catch {
      setError("Ödeme bağlantısı kurulamadı. Lütfen tekrar deneyin.");
    } finally {
      setCheckoutPending(false);
    }
  }

  async function submitLoggedInCheckout() {
    if (!validateOrderInputs()) {
      return;
    }

    setCheckoutPending(true);

    try {
      const response = await fetch("/api/checkout/dashboard-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "single",
          serviceId: service.id,
          link: link.trim(),
          quantity: isCustomComments ? commentCount : parsedQuantity,
          comments: isCustomComments ? commentLines.join("\n") : undefined,
        }),
      });

      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok) {
        setError(data.error ?? "Sipariş başlatılamadı.");
        return;
      }

      if (data.status === "payment_required" && data.token) {
        localStorage.setItem("last_payment_info", JSON.stringify({
          id: data.paymentId,
          amount: remainingForPayTR,
          currency: "TRY"
        }));
        setPaytrToken(data.token);
        setSuccess(data.message ?? "Kalan ödeme için PayTR ile devam edin.");
        return;
      }

      setSuccess(data.message ?? "Sipariş oluşturuldu.");
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "purchase", {
          transaction_id: data.paymentId || `BAL-${Date.now()}`,
          value: total,
          currency: "TRY",
          items: [
            {
              item_name: "Sipariş (Bakiye)",
              price: total,
              quantity: 1,
            }
          ]
        });
        (window as any).gtag("event", "conversion", {
          send_to: "AW-10832016569/PfY7CML5prscELnpja0o",
          value: total,
          currency: "TRY",
          transaction_id: data.paymentId || `BAL-${Date.now()}`
        });
      }
      setTimeout(() => router.push(successRedirect), 800);
    } catch {
      setError("Sipariş akışı başlatılamadı. Lütfen tekrar deneyin.");
    } finally {
      setCheckoutPending(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoggedIn) {
      if (!validateOrderInputs()) {
        return;
      }
      setOpen(true);
      return;
    }

    void submitLoggedInCheckout();
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"
      >
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Stokta
          </span>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="purchase-link"
            className="text-xs font-semibold text-foreground"
          >
            Bağlantı / Kullanıcı Adı
          </label>
          <input
            id="purchase-link"
            type="text"
            required
            inputMode="text"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              resetRetailCheckout({ abandonPending: true });
            }}
            placeholder={`${service.linkPlaceholder} veya @kullaniciadi`}
            className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[10px] text-muted-foreground">
            Herkese açık profil/gönderi bağlantısı veya yalnızca kullanıcı adını girebilirsiniz. Şifre istemiyoruz.
          </p>
        </div>

        {isCustomComments ? (
          <div className="space-y-1.5">
            <label
              htmlFor="purchase-comments"
              className="flex items-center justify-between text-xs font-semibold text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <MessageCircle size={13} className="text-primary" />
                Özel Yorumlar
                <span className="text-destructive">*</span>
              </span>
              {commentCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    commentCountValid
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {commentCount} yorum · {formatTotal(total, service.currency, service.intlLocale)}
                </span>
              )}
            </label>
            <textarea
              id="purchase-comments"
              value={customComments}
              onChange={(e) => {
                setCustomComments(e.target.value);
                resetRetailCheckout({ abandonPending: true });
              }}
              rows={6}
              placeholder={
                "Güzel fotoğraf!\nHarika içerik, beğendim\nÇok iyi görünüyor 👏\n..."
              }
              className="block w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p
              className={`text-[10px] ${
                commentCount > 0 && !commentCountValid
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              Her satır 1 yorum · Girilen:{" "}
              <strong className="text-foreground">{commentCount}</strong> · Min:{" "}
              {service.min.toLocaleString("tr-TR")} — Maks:{" "}
              {service.max.toLocaleString("tr-TR")}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label
              htmlFor="purchase-qty"
              className="flex items-center justify-between text-xs font-semibold text-foreground"
            >
              <span>Miktar</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {service.min.toLocaleString("tr-TR")} - {service.max.toLocaleString("tr-TR")}
              </span>
            </label>
            <div className="rounded-2xl border border-border bg-muted/20 p-2.5">
              <div className="flex items-stretch gap-1.5">
                <button
                  type="button"
                  aria-label="Miktarı azalt"
                  onClick={() =>
                    syncQuantity(
                      (quantityValid ? parsedQuantity : service.min) - Math.max(1, service.min),
                    )
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Minus size={14} />
                </button>
                <div className="flex-1 rounded-xl border border-input bg-background px-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Miktar
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {quantityValid
                        ? "Hazır"
                        : quantityInput.trim().length === 0
                          ? "Değer girin"
                          : "Aralık dışı"}
                    </span>
                  </div>
                  <input
                    id="purchase-qty"
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="done"
                    autoComplete="off"
                    value={quantityInput}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    onBlur={handleQuantityBlur}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder={service.min.toLocaleString("tr-TR")}
                    className="block w-full border-0 bg-transparent px-0 pb-2 pt-1 text-center text-2xl font-extrabold text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Miktarı arttır"
                  onClick={() =>
                    syncQuantity(
                      (quantityValid ? parsedQuantity : service.min) + Math.max(1, service.min),
                    )
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 px-1">
                <p
                  className={`text-[10px] ${
                    quantityInput.trim().length > 0 && !quantityValid
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {quantityInput.trim().length === 0
                    ? `Min ${service.min.toLocaleString("tr-TR")} ile başlayın`
                    : quantityValid
                      ? `Sipariş miktarı: ${quantityPreview.toLocaleString("tr-TR")}`
                      : `Geçerli aralık: ${service.min.toLocaleString("tr-TR")} - ${service.max.toLocaleString("tr-TR")}`}
                </p>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Canlı toplam: {formatTotal(total, service.currency, service.intlLocale)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { label: "×1", factor: 1 },
                { label: "×2", factor: 2 },
                { label: "×5", factor: 5 },
                { label: "×10", factor: 10 },
              ].map(({ label, factor }) => (
                <button
                  type="button"
                  key={factor}
                  onClick={() => syncQuantity(service.min * factor)}
                  className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => syncQuantity(service.max)}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Maks
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-muted/40 p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Birim fiyat / 1.000</span>
            <span className="font-semibold text-foreground">
              {formatTotal(service.unitPrice, service.currency, service.intlLocale)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Girilen miktar</span>
            <span className="font-semibold text-foreground">
              {effectiveQty.toLocaleString("tr-TR")}
            </span>
          </div>
          {isLoggedIn ? (
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Wallet size={14} /> {t("availableBalance")}
                </span>
                <span className="font-semibold text-foreground">
                  {formatTotal(userBalance, service.currency, service.intlLocale)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-muted-foreground">{t("willUseBalance")}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatTotal(willUseBalance, service.currency, service.intlLocale)}
                </span>
              </div>
              {remainingForPayTR > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard size={14} /> {t("paytrAmount")}
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {formatTotal(dashboardPayTRMinimum.payableAmount, service.currency, service.intlLocale)}
                  </span>
                </div>
              )}
              {dashboardPayTRMinimum.applied && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                  Sipariş tutarınız 1,00 TL’nin altında olduğu için karttan en az 1,00 TL çekilir; aradaki {formatTotal(dashboardPayTRMinimum.surplusAmount, service.currency, service.intlLocale)} bakiyenize eklenir.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Ödeme komisyonu (%5)</span>
                <span className="font-semibold text-foreground">
                  {formatTotal(paymentCommission, service.currency, service.intlLocale)}
                </span>
              </div>
              {guestBelowCryptoMinimum && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                  Kripto para ile ödeme yalnızca {CRYPTOMUS_MINIMUM_TL.toFixed(2)} TL ve üzeri siparişlerde kullanılabilir. Lütfen miktarı artırın.
                </div>
              )}
            </div>
          )}
          <div className="mt-2 flex items-end justify-between border-t border-border/60 pt-2">
            <span className="text-xs text-muted-foreground">
              {isLoggedIn
                ? remainingForPayTR > 0
                  ? "Toplam sipariş tutarı"
                  : "Bakiyeden tahsil edilecek"
                : "Ödenecek toplam"}
            </span>
            <span className="text-2xl font-extrabold text-foreground">
              {formatTotal(
                isLoggedIn ? total : payableTotal,
                service.currency,
                service.intlLocale,
              )}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {!isLoggedIn && (
          <div className="rounded-2xl border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
            Misafir siparişte sadece ad, e-posta ve telefon bilgileri bir sonraki modal adımında alınır.
          </div>
        )}

        <button
          type="submit"
          disabled={submitPending || (isLoggedIn ? !formValid : !orderInputValid)}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${ctaGradient} text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {submitPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isLoggedIn ? (
            remainingForPayTR > 0 ? <CreditCard size={16} /> : isCustomComments ? <MessageCircle size={16} /> : <ShoppingCart size={16} />
          ) : (
            <CreditCard size={16} />
          )}
          {submitPending
            ? isLoggedIn
              ? "Sipariş hazırlanıyor..."
              : "Ödeme hazırlanıyor..."
            : isLoggedIn
              ? remainingForPayTR > 0
                ? t("payAndPurchase")
                : t("submitOrder")
              : "Misafir Olarak Devam Et"}
        </button>

        <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center text-[10px] text-muted-foreground">
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Güvenli ödeme</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap size={14} className="text-amber-500" />
            <span>Anında işlem</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <CheckCircle2 size={14} className="text-sky-500" />
            <span>7/24 destek</span>
          </div>
        </div>
      </form>

      {!isLoggedIn && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[min(560px,calc(100vw-1rem))] max-w-[min(560px,calc(100vw-1rem))] p-0 sm:max-w-[560px]" showCloseButton>
            <div className="border-b border-border/60 px-5 py-4 sm:px-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-foreground sm:text-xl">
                  Misafir Bilgileri
                </DialogTitle>
                <DialogDescription className="max-w-2xl text-sm leading-6">
                  Sipariş detayların hazır. Devam etmek için yalnızca iletişim bilgilerini girmen yeterli.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="guest-name" className="text-xs font-semibold text-foreground">
                    Ad Soyad
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    autoComplete="name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      resetRetailCheckout({ abandonPending: true });
                      if (error) setError(null);
                    }}
                    placeholder="Ad Soyad"
                    className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="guest-email" className="text-xs font-semibold text-foreground">
                    E-posta
                  </label>
                  <input
                    id="guest-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      resetRetailCheckout({ abandonPending: true });
                      if (error) setError(null);
                    }}
                    placeholder="ornek@email.com"
                    className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="guest-phone" className="text-xs font-semibold text-foreground">
                    Telefon
                  </label>
                  <input
                    id="guest-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      resetRetailCheckout({ abandonPending: true });
                      if (error) setError(null);
                    }}
                    placeholder="+90 555 000 00 00"
                    className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ödeme komisyonu (%5)</span>
                  <span className="font-semibold text-foreground">
                    {formatTotal(paymentCommission, service.currency, service.intlLocale)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-sm font-semibold text-foreground">Ödenecek tutar</span>
                  <span className="text-lg font-extrabold text-foreground">
                    {formatTotal(payableTotal, service.currency, service.intlLocale)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Wallet size={12} className="text-sky-500" />
                  <span>Ödeme kripto para (Cryptomus) ile alınır.</span>
                </div>
                {guestBelowCryptoMinimum && (
                  <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                    Kripto para ile ödeme yalnızca {CRYPTOMUS_MINIMUM_TL.toFixed(2)} TL ve üzeri siparişlerde kullanılabilir.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => void submitGuestCheckout()}
                disabled={submitPending || !guestInfoValid || guestBelowCryptoMinimum}
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${ctaGradient} text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {submitPending ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                {submitPending ? "Ödeme hazırlanıyor..." : "Kripto İle Ödemeye Geç"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DashboardPayTRDialog
        open={Boolean(paytrToken)}
        token={paytrToken}
        title={t("orderPayTitle")}
        description={success ?? undefined}
        successRedirect={
          paytrResult === "success"
            ? retailPaymentId
              ? `/order-tracking?paymentId=${retailPaymentId}&status=paid`
              : "/dashboard/orders"
            : undefined
        }
        onResult={(result) => setPaytrResult(result)}
        onClose={() => resetRetailCheckout({ abandonPending: paytrResult !== "success" })}
      />
    </>
  );
}
