"use client";

import { useMemo, useRef, useState } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { useAbandonedTracker } from "@/lib/hooks/useAbandonedTracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getLevelDiscountPercent } from "@/lib/level-discount";
import { ServiceDescriptionCard } from "@/components/dashboard/ServiceDescriptionCard";
import {
  ServiceCatalogSelector,
  type CatalogServiceItem,
} from "@/components/dashboard/ServiceCatalogSelector";
import { DashboardPayTRDialog } from "@/components/dashboard/DashboardPayTRDialog";
import {
  ShoppingCart,
  Loader2,
  Gauge,
  Info,
  RefreshCw,
  XCircle,
  Layers,
  Wallet,
  CreditCard,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPlatformLinkPlaceholder, isCustomCommentServiceType } from "@/lib/platform-utils";
import { calculateClientCharge, unitPriceSuffix } from "@/lib/client-pricing";

type ServiceOption = CatalogServiceItem & {
  description: string | null;
};

type Props = {
  services: ServiceOption[];
  t: Record<string, string>;
  userBalance: number;
  userLevel: number;
};

type CheckoutResponse = {
  status: "created" | "payment_required";
  message: string;
  totalAmount: number;
  usedBalance: number;
  remainingAmount: number;
  orderIds: string[];
  token?: string;
};

export function NewOrderAdvanced({ services, t, userBalance, userLevel }: Props) {
  const { format: fp } = useCurrency();
  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );

  const formRef = useRef<HTMLDivElement>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [customComments, setCustomComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [paytrMessage, setPaytrMessage] = useState<string | null>(null);

  // Terk edilmiş sepet takibi
  const trackerData = useMemo(() => ({
    selectedServiceId,
    link,
    quantity,
    customComments,
  }), [selectedServiceId, link, quantity, customComments]);

  useAbandonedTracker("ORDER", trackerData);

  const selectedService = selectedServiceId ? serviceById.get(selectedServiceId) : null;
  const isCustomComments = isCustomCommentServiceType(selectedService);
  const commentLines = customComments.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const commentCount = commentLines.length;
  const commentCountWithinLimits = selectedService
    ? commentCount >= selectedService.min && commentCount <= selectedService.max
    : false;

  // For custom comments, quantity = number of comment lines; else use input
  const quantityNum = isCustomComments ? commentCount : (parseInt(quantity) || 0);
  const calculatedPrice = selectedService
    ? calculateClientCharge(selectedService.unitPrice, quantityNum, selectedService.pricingMode, userLevel)
    : 0;
  const willUseBalance = Math.min(userBalance, calculatedPrice);
  const discountPercent = getLevelDiscountPercent(userLevel);
  const remainingForPayTR = Math.max(calculatedPrice - userBalance, 0);
  const platformName = selectedService?.parentCategoryName ?? selectedService?.categoryName ?? null;
  const isUsernameOnly = selectedService?.linkFormat === "USERNAME";
  const linkPlaceholder = isUsernameOnly
    ? "@kanaladi veya kanaladi"
    : getPlatformLinkPlaceholder(platformName);

  const handleSelectService = (service: CatalogServiceItem) => {
    setSelectedServiceId(service.id);
    setQuantity(String(service.min));
    setCustomComments("");
    setError(null);
    setSuccess(null);
    // Mobilde sipariş formuna otomatik kayma
    setTimeout(() => {
      if (window.innerWidth < 1024 && formRef.current) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCustomComments) {
      if (!selectedServiceId || !link.trim() || commentCount < 1) {
        setError("Servis, link ve en az 1 yorum satırı zorunludur.");
        return;
      }
      if (commentCount < selectedService!.min) {
        setError(`En az ${selectedService!.min} yorum satırı girilmeli.`);
        return;
      }
      if (commentCount > selectedService!.max) {
        setError(`En fazla ${selectedService!.max} yorum satırı girilebilir.`);
        return;
      }
    } else {
      if (!selectedServiceId || !link.trim() || quantityNum <= 0) {
        setError(t.requiredFields ?? "Servis, link ve miktar zorunludur.");
        return;
      }
      if (isUsernameOnly && /^https?:\/\//i.test(link.trim())) {
        setError("Bu servis sadece kullanıcı adı kabul eder. Tam link yerine yalnızca kullanıcı adınızı girin (örn: @kanaladi).");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const body: Record<string, unknown> = {
        mode: "single",
        serviceId: selectedServiceId,
        link: link.trim(),
      };

      if (isCustomComments) {
        body.comments = commentLines.join("\n");
        body.quantity = commentCount;
      } else {
        body.quantity = quantityNum;
      }

      const response = await fetch("/api/checkout/dashboard-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as CheckoutResponse & { error?: string; paymentId?: string };

      if (!response.ok) {
        setError(data.error ?? (t.orderFailed ?? "Sipariş başlatılamadı."));
        return;
      }

      setSuccess(data.message);

      if (data.status === "payment_required" && data.token) {
        localStorage.setItem("last_payment_info", JSON.stringify({
          id: data.paymentId,
          amount: data.remainingAmount,
          currency: "TRY"
        }));
        setPaytrToken(data.token);
        setPaytrMessage(data.message);
      } else {
        if (typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "purchase", {
            transaction_id: data.orderIds?.[0] || `BAL-${Date.now()}`,
            value: data.totalAmount,
            currency: "TRY",
            items: [
              {
                item_name: "Sipariş (Bakiye)",
                price: data.totalAmount,
                quantity: 1,
              }
            ]
          });
          (window as any).gtag("event", "conversion", {
            send_to: "AW-10832016569/PfY7CML5prscELnpja0o",
            value: data.totalAmount,
            currency: "TRY",
            transaction_id: data.orderIds?.[0] || `BAL-${Date.now()}`
          });
        }
        setLink("");
        setCustomComments("");
      }
    } catch {
      setError(t.errorRetry ?? "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ServiceCatalogSelector
            services={services}
            selectedServiceId={selectedServiceId}
            onSelectService={handleSelectService}
            formatPrice={fp}
            platformLabel={t.choosePlatform}
            searchPlaceholder={t.searchServices}
            selectPlatformHint={t.selectPlatformHint ?? "Yukarıdan bir platform seçin"}
            selectCategoryHint={t.selectCategoryHint ?? "Devam etmek için bir kategori seçin."}
            pageSize={30}
            loadingMoreLabel={t.loadingMore}
            noResultsLabel={t.noResults}
            showAllLabel={t.showAllPlatforms}
            showLessLabel={t.showLess}
            serviceCountLabel={(count) =>
              (t.serviceCount ?? "{count} servis").replace("{count}", String(count))
            }
          />
        </div>

        {/* ─── SAĞ PANEL / SİPARİŞ FORMU ─────────────────────────────────── */}
        <div ref={formRef} className="scroll-mt-4 space-y-4 self-start lg:sticky lg:top-4">
          {selectedService ? (
            <>
              <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.serviceDetails ?? "Servis Bilgileri"}
                    </h3>
                    <p className="text-sm font-medium">{selectedService.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Gauge size={12} /> {t.rate ?? "Fiyat"}</p>
                      <p className="mt-1 text-sm font-bold text-primary">{fp(selectedService.unitPrice)} {unitPriceSuffix(selectedService.pricingMode)}</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Info size={12} /> Min / Max</p>
                      <p className="mt-1 text-sm font-bold">{selectedService.min.toLocaleString()} / {selectedService.max.toLocaleString()}</p>
                    </div>
                  </div>

                  {(selectedService.canCancel || selectedService.canRefill || selectedService.hasDripfeed) ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedService.canRefill ? (
                        <Badge variant="secondary" className="gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          <RefreshCw size={11} /> {t.badgeRefill ?? "Refill Destekli"}
                        </Badge>
                      ) : null}
                      {selectedService.canCancel ? (
                        <Badge variant="secondary" className="gap-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-400">
                          <XCircle size={11} /> {t.badgeCancel ?? "İptal Edilebilir"}
                        </Badge>
                      ) : null}
                      {selectedService.hasDripfeed ? (
                        <Badge variant="secondary" className="gap-1.5 border border-sky-500/30 bg-sky-500/10 text-sky-400">
                          <Layers size={11} /> {t.badgeDripfeed ?? "Kademeli Teslimat"}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <ServiceDescriptionCard description={selectedService.description} />
            </>
          ) : null}

          <Card className="border-white/10 shadow-xl">
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t.newOrder ?? "Yeni Sipariş"}
              </h3>

              {!selectedService ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-muted-foreground">
                  <ShoppingCart size={28} className="opacity-30" />
                  <p>{t.selectServiceFirst ?? "Soldaki listeden bir servis seçin"}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Seçili servis özeti - mobilde servis hatırlatıcı */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 lg:hidden">
                    <p className="text-[11px] uppercase tracking-wider text-primary/60">{t.selectedService ?? "Seçili Servis"}</p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug">{selectedService.name}</p>
                    <p className="text-xs text-muted-foreground">{fp(selectedService.unitPrice)} {unitPriceSuffix(selectedService.pricingMode)} &middot; min {selectedService.min.toLocaleString()}</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{isUsernameOnly ? "Kullanıcı Adı" : (t.link ?? "Link")}</label>
                    {isUsernameOnly && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                        <Info size={13} className="mt-0.5 shrink-0" />
                        <span>Bu servis sadece <strong>kullanıcı adı</strong> ile sipariş alınabilir. Tam link değil, yalnızca kullanıcı adını girin (örn: <code className="font-mono">@kanaladi</code>).</span>
                      </div>
                    )}
                    <Input
                      value={link}
                      onChange={(event) => setLink(event.target.value)}
                      placeholder={linkPlaceholder}
                      className="h-11"
                      required
                    />
                  </div>

                  {isCustomComments ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-sm font-medium">
                          <MessageCircle size={14} className="text-primary" />
                          Özel Yorumlar <span className="text-destructive">*</span>
                        </label>
                        {commentCount > 0 && (
                          <Badge variant="secondary" className="text-xs">{commentCount} yorum · {fp(calculatedPrice)}</Badge>
                        )}
                      </div>
                      <textarea
                        value={customComments}
                        onChange={(e) => setCustomComments(e.target.value)}
                        rows={6}
                        placeholder={"Güzel fotoğraf!\nHarika içerik, beğendim\nÇok iyi görünüyor 👏\n..."}
                        className="w-full resize-y rounded-lg border border-white/10 bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <p className={cn(
                        "text-xs",
                        commentCount > 0 && !commentCountWithinLimits ? "text-amber-400" : "text-muted-foreground"
                      )}>
                        Her satır 1 yorum · Miktar: {commentCount.toLocaleString()} · Min: {selectedService.min.toLocaleString()} — Max: {selectedService.max.toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">{t.quantity ?? "Miktar"}</label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        min={selectedService.min}
                        max={selectedService.max}
                        placeholder={String(selectedService.min)}
                        className="h-11"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        {(t.minMaxHint ?? "Min: {min} — Maks: {max}")
                          .replace("{min}", selectedService.min.toLocaleString())
                          .replace("{max}", selectedService.max.toLocaleString())}
                      </p>
                    </div>
                  )}

                  {quantityNum > 0 ? (
                    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="text-center relative">
                        {discountPercent > 0 && (
                          <Badge variant="secondary" className="absolute -top-1 right-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            Lvl {userLevel} · %{discountPercent} İndirim
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">{t.totalCost ?? "Toplam Tutar"}</p>
                        <p className="mt-1 text-2xl font-bold text-primary">{fp(calculatedPrice)}</p>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                          <span className="flex items-center gap-2 text-muted-foreground"><Wallet size={14} /> {t.availableBalance ?? "Kullanılabilir Bakiye"}</span>
                          <span className="font-semibold">{fp(userBalance)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                          <span className="text-muted-foreground">{t.willUseBalance ?? "Bakiyeden Kullanılacak"}</span>
                          <span className="font-semibold text-emerald-400">{fp(willUseBalance)}</span>
                        </div>
                        {remainingForPayTR > 0 ? (
                          <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                            <span className="flex items-center gap-2 text-muted-foreground"><CreditCard size={14} /> {t.paytrAmount ?? "Kart ile Ödenecek"}</span>
                            <span className="font-semibold text-amber-400">{fp(remainingForPayTR)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-12 w-full gap-2 text-base font-bold"
                    disabled={loading || !link.trim() || (isCustomComments ? !commentCountWithinLimits : quantityNum <= 0)}
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin" size={18} /> {t.processing ?? "İşleniyor..."}</>
                    ) : remainingForPayTR > 0 ? (
                      <><CreditCard size={18} /> {t.payAndPurchase ?? "Bakiye + Kart ile Satın Al"}</>
                    ) : (
                      <><ShoppingCart size={18} /> {t.submitOrder ?? "SİPARİŞ VER"}</>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── MOBİL STICKY ALT ÇUBUĞU ───────────────────────────────── */}
      {selectedService && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-white/10 bg-background/95 backdrop-blur-md px-4 py-3 safe-area-pb">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-snug">{selectedService.name}</p>
              {quantityNum > 0 ? (
                <p className="text-xs font-bold text-primary">{fp(calculatedPrice)}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{fp(selectedService.unitPrice)} {unitPriceSuffix(selectedService.pricingMode)}</p>
              )}
            </div>
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() =>
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <ChevronDown size={15} /> {t.mobileViewOrder ?? "Sipariş Formunu Gör"}
            </Button>
          </div>
        </div>
      )}

      <DashboardPayTRDialog
        open={Boolean(paytrToken)}
        token={paytrToken}
        title={t.orderPayTitle ?? "Sipariş Ödemesi"}
        description={paytrMessage ?? undefined}
        successRedirect="/dashboard/orders"
        onClose={() => setPaytrToken(null)}
      />
    </div>
  );
}
