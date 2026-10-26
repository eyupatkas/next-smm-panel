"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  Search,
  XCircle,
  AlertCircle,
  ExternalLink,
  Layers,
} from "lucide-react";

interface OrderResult {
  id: string;
  shortId: string;
  status: string;
  serviceName: string;
  packageName: string;
  charge: number;
  quantity: number;
  startCount: number;
  remains: number;
  link: string;
  createdAt: string;
  updatedAt: string;
  hasError: boolean;
  // combo flag may exist in single result too
  combo?: false;
}

interface ComboItem {
  id: string;
  shortId: string;
  status: string;
  serviceName: string;
  quantity: number;
  remains: number;
  hasError: boolean;
}

interface ComboResult {
  combo: true;
  orders: ComboItem[];
  paymentStatus?: string;
  awaiting?: boolean;
  message?: string;
}

type TrackingResult = OrderResult | ComboResult;

function statusConfig(status: string): {
  label: string;
  color: string;
  icon: React.ReactNode;
  bg: string;
} {
  switch (status) {
    case "AWAITING_PAYMENT":
      return {
        label: "Ödeme Bekleniyor",
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        icon: <Clock size={18} className="text-amber-400" />,
      };
    case "EXPIRED":
      return {
        label: "Süresi Doldu",
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
        icon: <XCircle size={18} className="text-red-400" />,
      };
    case "IN_PROGRESS":
      return {
        label: "Devam Ediyor",
        color: "text-sky-400",
        bg: "bg-sky-500/10 border-sky-500/20",
        icon: <Loader2 size={18} className="text-sky-400" />,
      };
    case "COMPLETED":
      return {
        label: "Tamamlandı",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        icon: <CheckCircle2 size={18} className="text-emerald-400" />,
      };
    case "PROCESSING":
      return {
        label: "İşlem Sırasında",
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        icon: <Loader2 size={18} className="text-blue-400 animate-spin" />,
      };
    case "PENDING":
      return {
        label: "Bekliyor",
        color: "text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/20",
        icon: <Clock size={18} className="text-yellow-400" />,
      };
    case "PARTIAL":
      return {
        label: "Kısmi Tamamlandı",
        color: "text-orange-400",
        bg: "bg-orange-500/10 border-orange-500/20",
        icon: <AlertCircle size={18} className="text-orange-400" />,
      };
    case "CANCELED":
      return {
        label: "İptal Edildi",
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
        icon: <XCircle size={18} className="text-red-400" />,
      };
    default:
      return {
        label: status,
        color: "text-muted-foreground",
        bg: "bg-muted/10 border-border",
        icon: <Package size={18} className="text-muted-foreground" />,
      };
  }
}

export default function OrderTrackingClient() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("id") ?? "");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [awaitingAttempts, setAwaitingAttempts] = useState(0);

  // URL'de paymentId veya id varsa otomatik yükle
  useEffect(() => {
    const paymentIdFromUrl = searchParams.get("paymentId");
    const idFromUrl = searchParams.get("id");
    if (paymentIdFromUrl) {
      void fetchByPaymentId(paymentIdFromUrl);
    } else if (idFromUrl) {
      setOrderId(idFromUrl);
      void fetchOrder(idFromUrl, "");
    }

  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("status") === "paid") {
        const stored = localStorage.getItem("last_payment_info");
        if (stored) {
          try {
            const paymentInfo = JSON.parse(stored);
            if (typeof (window as any).gtag === "function") {
              (window as any).gtag("event", "purchase", {
                transaction_id: paymentInfo.id || `RET-${Date.now()}`,
                value: Number(paymentInfo.amount),
                currency: paymentInfo.currency || "TRY",
                items: [
                  {
                    item_name: "Misafir / Paket Siparişi",
                    price: Number(paymentInfo.amount),
                    quantity: 1,
                  }
                ]
              });
              (window as any).gtag("event", "conversion", {
                send_to: "AW-10832016569/PfY7CML5prscELnpja0o",
                value: Number(paymentInfo.amount),
                currency: paymentInfo.currency || "TRY",
                transaction_id: paymentInfo.id || `RET-${Date.now()}`
              });
            }
            localStorage.removeItem("last_payment_info");
          } catch (e) {
            console.error("Error parsing last_payment_info:", e);
          }
        }
      }
    }
  }, []);

  async function fetchByPaymentId(pid: string, attempt = 0) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/order-tracking?paymentId=${encodeURIComponent(pid)}`);
      const data = await res.json() as (TrackingResult & { error?: string; awaiting?: boolean; failed?: boolean }) | { error: string };
      if (!res.ok || "error" in data) {
        // Callback henüz işlenmemiş olabilir — hemen hata göstermeyip birkaç kez dene.
        if (attempt < 8) {
          setAwaitingPayment(true);
          setAwaitingAttempts(attempt + 1);
          window.setTimeout(() => void fetchByPaymentId(pid, attempt + 1), 3000);
          return;
        }
        setError((data as { error: string }).error ?? "Sipariş bulunamadı.");
        return;
      }
      if (data.awaiting) {
        setAwaitingPayment(true);
        setAwaitingAttempts(attempt + 1);
        if (attempt < 20) {
          window.setTimeout(() => void fetchByPaymentId(pid, attempt + 1), 3000);
        }
        return;
      }
      if (data.failed) {
        setPaymentFailed(true);
        setAwaitingPayment(false);
        return;
      }
      setAwaitingPayment(false);
      setPaymentFailed(false);
      setAwaitingAttempts(0);
      setResult(data as TrackingResult);
      setLastChecked(new Date());
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrder(id: string, em: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({ id });
      if (em) params.set("email", em);

      const res = await fetch(`/api/order-tracking?${params.toString()}`);
      const data = (await res.json()) as TrackingResult & { error?: string };

      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Sipariş bulunamadı.");
      } else {
        setResult(data);
        setLastChecked(new Date());
      }
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) return;
    void fetchOrder(orderId.trim(), email.trim());
  }

  const isCombo = result && "combo" in result && result.combo === true;
  const singleResult = !isCombo ? (result as OrderResult | null) : null;
  const comboResult = isCombo ? (result as ComboResult) : null;

  const sc = singleResult ? statusConfig(singleResult.status) : null;
  const paidStatus = searchParams.get("status") === "paid";
  const progress =
    singleResult && singleResult.quantity > 0
      ? Math.round(((singleResult.quantity - singleResult.remains) / singleResult.quantity) * 100)
      : 0;

  const comboOverallStatus = comboResult
    ? comboResult.orders.every((o) => o.status === "COMPLETED") ? "COMPLETED"
      : comboResult.orders.some((o) => o.status === "CANCELED") ? "PARTIAL"
      : comboResult.orders.some((o) => o.status === "PROCESSING") ? "PROCESSING"
      : "PENDING"
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Ödeme Başarılı Banner */}
      {paidStatus && !paymentFailed && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-emerald-300 text-base">Ödemeniz Başarıyla Alındı!</p>
              <p className="mt-1 text-sm text-emerald-300/70">
                Siparişiniz sisteme kaydedildi ve işleme alındı. Aşağıdan sipariş durumunuzu takip edebilirsiniz.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ödeme Başarısız Banner */}
      {(paymentFailed || searchParams.get("status") === "failed") && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <AlertCircle size={22} className="text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-300 text-base">Ödeme tamamlanamadı</p>
              <p className="mt-1 text-sm text-amber-300/70">
                Ödemeniz tamamlanamadı veya iptal edildi. Kartınızdan tahsilat yapılmadıysa yeniden deneyebilirsiniz; bir tutar tahsil edildiyse birkaç dakika içinde otomatik iade edilir.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ödeme işleniyor — sipariş birkaç saniye içinde oluşacak */}
      {awaitingPayment && !paymentFailed && (
        <Card className="border-sky-500/30 bg-sky-500/10">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
              <Loader2 size={22} className="animate-spin text-sky-400" />
            </div>
            <div>
              <p className="font-semibold text-sky-300 text-base">Ödemeniz işleniyor</p>
              <p className="mt-1 text-sm text-sky-300/70">
                Siparişiniz hazırlanıyor. Bu sayfa birkaç saniye içinde kendiliğinden güncellenecek — sekmeyi kapatmayın.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Arama Formu */}
      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search size={18} className="text-primary" />
            Sipariş Sorgula
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="order-id" className="text-xs text-muted-foreground">
                Sipariş Numarası *
              </Label>
              <Input
                id="order-id"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Örn: AB1C2D3E veya tam ID"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Sipariş verdiğinizde gösterilen 8 haneli kod
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-email" className="text-xs text-muted-foreground">
                E-posta <span className="text-muted-foreground/60">(opsiyonel, doğrulama için)</span>
              </Label>
              <Input
                id="order-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading || !orderId.trim()}>
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Sorgulanıyor...</>
              ) : (
                <><Search size={16} /> Siparişi Sorgula</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Hata */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <XCircle size={20} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tekli Sipariş Sonucu */}
      {singleResult && sc && (
        <Card className={`border ${sc.bg}`}>
          <CardContent className="p-6 space-y-5">
            {/* Başlık */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {sc.icon}
                  <span className={`font-semibold ${sc.color}`}>{sc.label}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Sipariş No: #{singleResult.shortId}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => void fetchOrder(orderId.trim(), email.trim())}
                disabled={loading}
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                Yenile
              </Button>
            </div>

            {/* Servis Adı */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-primary" />
                <span className="text-sm font-medium">{singleResult.packageName}</span>
              </div>

              {/* İlerleme çubuğu */}
              {["PROCESSING", "PARTIAL", "COMPLETED"].includes(singleResult.status) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>İlerleme</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        singleResult.status === "COMPLETED" ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Miktar</p>
                  <p className="font-semibold mt-0.5">{singleResult.quantity.toLocaleString("tr-TR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tutar</p>
                  <p className="font-semibold mt-0.5">
                    {singleResult.charge.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                {singleResult.status === "PROCESSING" && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Başlangıç</p>
                      <p className="font-semibold mt-0.5">{singleResult.startCount.toLocaleString("tr-TR")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kalan</p>
                      <p className="font-semibold mt-0.5">{singleResult.remains.toLocaleString("tr-TR")}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Hedef Link */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Hedef</p>
                <a
                  href={singleResult.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
                >
                  {singleResult.link.length > 50 ? singleResult.link.slice(0, 50) + "…" : singleResult.link}
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Tarih bilgisi */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sipariş: {new Date(singleResult.createdAt).toLocaleString("tr-TR")}</span>
              {lastChecked && <span>Son kontrol: {lastChecked.toLocaleTimeString("tr-TR")}</span>}
            </div>

            {singleResult.hasError && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-xs text-orange-400">
                ⚠️ Siparişte bir sorun oluştu. Destek ekibimizle iletişime geçebilirsiniz.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Kombo Paket Sonucu */}
      {comboResult && (
        <Card className="border border-violet-500/20 bg-violet-500/5">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Layers size={18} className="text-violet-400" />
                  <span className="font-semibold text-violet-300">Kombo Paket Siparişi</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {comboResult.orders.length} kalemlik kombo sipariş
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  const pid = searchParams.get("paymentId");
                  if (pid) void fetchByPaymentId(pid);
                  else if (orderId.trim()) void fetchOrder(orderId.trim(), email.trim());
                }}
                disabled={loading}
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                Yenile
              </Button>
            </div>

            {/* Genel Durum Özeti */}
            {comboOverallStatus && (() => {
              const cfg = statusConfig(comboOverallStatus);
              const completedCount = comboResult.orders.filter((o) => o.status === "COMPLETED").length;
              const processingCount = comboResult.orders.filter((o) => o.status === "PROCESSING").length;
              return (
                <div className={`rounded-xl border p-3 flex items-center gap-3 ${cfg.bg}`}>
                  {cfg.icon}
                  <div>
                    <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {completedCount}/{comboResult.orders.length} tamamlandı
                      {processingCount > 0 && ` • ${processingCount} işlemde`}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Her Kalem */}
            <div className="space-y-2">
              {comboResult.orders.map((item, i) => {
                const cfg = statusConfig(item.status);
                const itemProgress = item.quantity > 0
                  ? Math.round(((item.quantity - item.remains) / item.quantity) * 100)
                  : 0;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="text-xs font-medium text-slate-200 line-clamp-1">{item.serviceName}</span>
                      </div>
                      <div className={`flex items-center gap-1 shrink-0 text-[10px] font-medium ${cfg.color}`}>
                        {cfg.icon && <span className="scale-75">{cfg.icon}</span>}
                        {cfg.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>#{item.shortId}</span>
                      <span>{item.quantity.toLocaleString("tr-TR")} adet</span>
                      {item.remains > 0 && item.status === "PROCESSING" && (
                        <span className="text-amber-400">{item.remains.toLocaleString("tr-TR")} kalan</span>
                      )}
                    </div>
                    {["PROCESSING", "PARTIAL", "COMPLETED"].includes(item.status) && (
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${item.status === "COMPLETED" ? "bg-emerald-500" : "bg-violet-500"}`}
                          style={{ width: `${itemProgress}%` }}
                        />
                      </div>
                    )}
                    {item.hasError && (
                      <p className="text-[11px] text-orange-400 flex items-center gap-1">
                        <AlertCircle size={10} />Sorun oluştu — destek ekibimizle iletişime geçin
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {lastChecked && (
              <p className="text-xs text-muted-foreground text-right">
                Son kontrol: {lastChecked.toLocaleTimeString("tr-TR")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
