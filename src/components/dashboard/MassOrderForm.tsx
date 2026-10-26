"use client";

import { useState } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getLevelDiscountPercent } from "@/lib/level-discount";
import {
  ServiceCatalogSelector,
  type CatalogServiceItem,
} from "@/components/dashboard/ServiceCatalogSelector";
import { DashboardPayTRDialog } from "@/components/dashboard/DashboardPayTRDialog";
import { CheckCircle2, XCircle, Loader2, Layers, Wallet, CreditCard, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getPlatformLinkPlaceholder, isCustomCommentServiceType } from "@/lib/platform-utils";
import { calculateClientCharge, unitPriceSuffix } from "@/lib/client-pricing";

type ServiceOption = CatalogServiceItem;

type Props = {
  services: ServiceOption[];
  userBalance: number;
  userLevel: number;
};

type MassOrderResult = {
  ok: boolean;
  url: string;
  orderId?: string;
  error?: string;
  paymentRequired?: boolean;
};

type CheckoutResponse = {
  status: "created" | "payment_required";
  message: string;
  totalAmount: number;
  usedBalance: number;
  remainingAmount: number;
  orderIds: string[];
  results?: MassOrderResult[];
  token?: string;
};

export function MassOrderForm({ services, userBalance, userLevel }: Props) {
  const { format: fp } = useCurrency();
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [links, setLinks] = useState("");
  const [singleLink, setSingleLink] = useState("");
  const [customComments, setCustomComments] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<MassOrderResult[]>([]);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [paytrMessage, setPaytrMessage] = useState<string | null>(null);

  const isCustomComments = isCustomCommentServiceType(selectedService);
  const isUsernameOnly = selectedService?.linkFormat === "USERNAME";
  const platformName = selectedService?.parentCategoryName ?? selectedService?.categoryName ?? null;
  const linkPlaceholder = isUsernameOnly
    ? "@kanaladi veya kanaladi"
    : getPlatformLinkPlaceholder(platformName);

  // For custom comments: quantity = line count, single link
  const commentLines = customComments.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const commentCount = commentLines.length;
  const commentCountWithinLimits = selectedService
    ? commentCount >= selectedService.min && commentCount <= selectedService.max
    : false;

  // For mass order: multiple links
  const linkCount = links
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;

  const quantityNum = parseInt(quantity) || 0;

  // Cost calculation
  const costPerOrder = selectedService && quantityNum
    ? calculateClientCharge(selectedService.unitPrice, quantityNum, selectedService.pricingMode, userLevel)
    : 0;
  const customCommentsCost = selectedService && commentCount > 0
    ? calculateClientCharge(selectedService.unitPrice, commentCount, selectedService.pricingMode, userLevel)
    : 0;
  const totalCost = isCustomComments ? customCommentsCost : costPerOrder * linkCount;
  const willUseBalance = Math.min(userBalance, totalCost);
  const discountPercent = getLevelDiscountPercent(userLevel);
  const remainingForPayTR = Math.max(totalCost - userBalance, 0);
  const successCount = results.filter((item) => item.ok).length;
  const failCount = results.filter((item) => !item.ok).length;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedService) {
      setError("Lütfen bir servis seçin.");
      return;
    }

    if (isCustomComments) {
      if (!singleLink.trim()) {
        setError("Link zorunludur.");
        return;
      }
      if (commentCount < 1) {
        setError("En az 1 yorum satırı girmelisiniz.");
        return;
      }
      if (commentCount < selectedService.min) {
        setError(`En az ${selectedService.min.toLocaleString("tr-TR")} yorum satırı girmelisiniz.`);
        return;
      }
      if (commentCount > selectedService.max) {
        setError(`En fazla ${selectedService.max.toLocaleString("tr-TR")} yorum satırı girebilirsiniz.`);
        return;
      }
    } else {
      if (!quantityNum || linkCount === 0) {
        setError("Servis, miktar ve en az bir link zorunludur.");
        return;
      }
      if (isUsernameOnly) {
        const hasFullUrl = links.split("\n").some((l) => /^https?:\/\//i.test(l.trim()));
        if (hasFullUrl) {
          setError("Bu servis sadece kullanıcı adı kabul eder. Her satıra yalnızca kullanıcı adı girin (örn: @kanaladi).");
          return;
        }
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/checkout/dashboard-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isCustomComments
            ? {
                mode: "single",
                serviceId: selectedService.id,
                quantity: commentCount,
                link: singleLink.trim(),
                comments: commentLines.join("\n"),
              }
            : {
                mode: "mass",
                serviceId: selectedService.id,
                quantity: quantityNum,
                links: links
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line.length > 0),
              }
        ),
      });

      const data = (await response.json()) as CheckoutResponse & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Toplu sipariş başlatılamadı.");
        return;
      }

      setSuccess(data.message);
      setResults(data.results ?? []);

      if (data.status === "payment_required" && data.token) {
        setPaytrToken(data.token);
        setPaytrMessage(data.message);
      } else {
        setLinks("");
        setSingleLink("");
        setCustomComments("");
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
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

      {results.length > 0 ? (
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <Layers size={16} />
              Sipariş Sonuçları
              <Badge variant="default" className="bg-emerald-500/20 text-emerald-400">
                {successCount} başarılı
              </Badge>
              {failCount > 0 ? (
                <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                  {failCount} hata
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={`${result.url}-${index}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs",
                    result.ok ? "bg-emerald-500/10" : "bg-red-500/10",
                  )}
                >
                  {result.ok ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle size={14} className="shrink-0 text-red-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{result.url}</span>
                  {result.ok ? (
                    <span className="shrink-0 font-mono text-emerald-400">
                      #{result.orderId?.slice(-6)}{result.paymentRequired ? " · ödeme bekliyor" : ""}
                    </span>
                  ) : (
                    <span className="shrink-0 text-red-400">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <ServiceCatalogSelector
            services={services}
            selectedServiceId={selectedService?.id || null}
            onSelectService={(service) => {
              setSelectedService(service);
              setQuantity(String(service.min));
              setSingleLink("");
              setCustomComments("");
              setError(null);
              setSuccess(null);
            }}
            formatPrice={fp}
            platformLabel="Platform Seçin"
            searchPlaceholder="Servis ara..."
            selectPlatformHint="Toplu sipariş için önce bir platform seçin."
            selectCategoryHint="Toplu sipariş için bir kategori seçin."
            pageSize={30}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="text-base">Sipariş Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedService ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                  <p className="line-clamp-1 text-sm font-medium">{selectedService.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Min: {selectedService.min.toLocaleString()} - Max: {selectedService.max.toLocaleString()} - {fp(selectedService.unitPrice)} {unitPriceSuffix(selectedService.pricingMode)}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-white/10 px-4 py-3 text-sm text-muted-foreground">
                  Sol taraftan servis seçin.
                </p>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {isCustomComments ? "Link" : (isUsernameOnly ? "Kullanıcı Adı" : "Miktar")}
                </label>
                {isUsernameOnly && !isCustomComments && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                    <span>⚠️ Bu servis sadece <strong>kullanıcı adı</strong> ile sipariş alınabilir. Her satıra URL değil yalnızca kullanıcı adı girin (örn: <code className="font-mono">@kanaladi</code>).</span>
                  </div>
                )}
                {isCustomComments ? (
                  <Input
                    value={singleLink}
                    onChange={(e) => setSingleLink(e.target.value)}
                    placeholder={linkPlaceholder}
                    type="url"
                    className="h-9"
                  />
                ) : (
                  <input
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    min={selectedService?.min ?? 1}
                    max={selectedService?.max ?? 1000000}
                    placeholder="Miktar"
                    className="h-9 w-full rounded-lg border border-white/10 bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-medium">
                    {isCustomComments ? (
                      <>
                        <MessageCircle size={14} className="text-primary" />
                        Yorumlar <span className="text-destructive">*</span>
                      </>
                    ) : (
                      "Linkler (her satıra bir link)"
                    )}
                  </label>
                  {isCustomComments
                    ? commentCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {commentCount} yorum · {fp(customCommentsCost)}
                        </Badge>
                      )
                    : linkCount > 0 && (
                        <Badge variant="secondary" className="text-xs">{linkCount} link</Badge>
                      )}
                </div>
                {isCustomComments ? (
                  <>
                    <textarea
                      value={customComments}
                      onChange={(e) => setCustomComments(e.target.value)}
                      rows={8}
                      placeholder={"Güzel fotoğraf!\nHarika içerik, beğendim\nÇok iyi görünüyor 👏\n..."}
                      className="w-full resize-y rounded-lg border border-white/10 bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <p className={cn(
                      "text-xs",
                      commentCount > 0 && !commentCountWithinLimits ? "text-amber-400" : "text-muted-foreground"
                    )}>
                      Her satır = 1 yorum · Miktar: {commentCount.toLocaleString()} · Min: {selectedService?.min.toLocaleString()} — Max: {selectedService?.max.toLocaleString()}
                    </p>
                  </>
                ) : (
                  <textarea
                    value={links}
                    onChange={(event) => setLinks(event.target.value)}
                    rows={10}
                    placeholder={`${linkPlaceholder}\n${linkPlaceholder}\n...`}
                    className="w-full resize-none rounded-lg border border-white/10 bg-card px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                )}
              </div>

              {(isCustomComments ? commentCount > 0 : linkCount > 0 && quantityNum > 0) && selectedService ? (
                <div className="space-y-2 rounded-lg border border-white/10 bg-card/50 px-4 py-3">
                  {isCustomComments ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Miktar (yorum sayısı)</span>
                        <span className="font-bold">{commentCount}</span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          Toplam Tutar
                          {discountPercent > 0 && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1 py-0 h-4">
                              Lvl {userLevel} · %{discountPercent} İndirim
                            </Badge>
                          )}
                        </span>
                        <span className="font-bold text-primary">{fp(customCommentsCost)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sipariş başı maliyet</span>
                        <span>{fp(costPerOrder)}</span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          Toplam ({linkCount} sipariş)
                          {discountPercent > 0 && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1 py-0 h-4">
                              Lvl {userLevel} · %{discountPercent} İndirim
                            </Badge>
                          )}
                        </span>
                        <span className="font-bold text-primary">{fp(totalCost)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Wallet size={14} /> Kullanılabilir Bakiye</span>
                    <span>{fp(userBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bakiyeden Kullanılacak</span>
                    <span className="font-semibold text-emerald-400">{fp(willUseBalance)}</span>
                  </div>
                  {remainingForPayTR > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground"><CreditCard size={14} /> PayTR ile Ödenecek</span>
                      <span className="font-semibold text-amber-400">{fp(remainingForPayTR)}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={
                  loading ||
                  !selectedService ||
                  (isCustomComments ? !commentCountWithinLimits || !singleLink.trim() : linkCount === 0 || !quantityNum)
                }
                className="w-full gap-2"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> İşleniyor...</>
                ) : remainingForPayTR > 0 ? (
                  <><CreditCard size={16} /> Bakiye + PayTR ile Satın Al</>
                ) : isCustomComments ? (
                  <><MessageCircle size={16} /> {commentCount > 0 ? `${commentCount} Yorum Gönder` : "Yorum Gönder"}</>
                ) : (
                  <><Layers size={16} /> {linkCount > 0 ? `${linkCount} Sipariş Oluştur` : "Sipariş Oluştur"}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>

      <DashboardPayTRDialog
        open={Boolean(paytrToken)}
        token={paytrToken}
        title="Toplu Sipariş Ödemesi"
        description={paytrMessage ?? undefined}
        successRedirect="/dashboard/orders"
        onClose={() => setPaytrToken(null)}
      />
    </div>
  );
}
