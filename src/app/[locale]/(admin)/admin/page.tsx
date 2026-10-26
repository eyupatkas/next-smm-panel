import { db } from "@/lib/db";
import { findJobRunsSafe } from "@/lib/job-runs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Megaphone, Package, RadioTower, Settings2, ShieldCheck, TrendingUp, Users, Wallet, XCircle, AlertCircle, Ticket } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";
import AdminProfitWidget from "@/components/admin/AdminProfitWidget";

export default async function AdminPage() {
  const now = new Date();
  const staleOrderCutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const recentErrorCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [users, services, orders, providers, jobRuns] = await Promise.all([
    db.user.count(),
    db.service.count(),
    db.order.count(),
    db.provider.count({ where: { status: true } }),
    findJobRunsSafe({ where: { jobName: "provider-sync" }, orderBy: { startedAt: "desc" }, take: 7 }),
  ]);

  // Sağlık kontrolleri
  const [stuckOrders, pendingTickets, recentErrors] = await Promise.all([
    // Sağlayıcıya gönderilememiş, 30+ dakikadır bekleyen siparişler
    db.order.count({
      where: {
        status: "PENDING",
        apiOrderId: null,
        providerSyncError: { not: null },
        createdAt: { lt: staleOrderCutoff },
        error: { not: "awaiting_payment" },
      },
    }),
    // Yanıtsız destek talepleri
    db.ticket.count({ where: { status: "OPEN" } }),
    // Son 24 saatte hata alan siparişler (iptal edilmeden önce)
    db.order.count({
      where: {
        status: "CANCELED",
        cancelledAt: { gte: recentErrorCutoff },
        providerSyncError: { not: null },
      },
    }),
  ]);

  // Provider bakiyesi kontrolü (external API)
  let providerBalance: number | null = null;
  let providerName: string | null = null;
  try {
    const provider = await db.provider.findFirst({
      where: { status: true },
      select: { apiUrl: true, apiKey: true, name: true },
    });
    if (provider) {
      providerName = provider.name;
      const res = await fetch(provider.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key: provider.apiKey, action: "balance" }).toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json() as { balance?: string };
        if (data.balance) providerBalance = parseFloat(data.balance);
      }
    }
  } catch { /* provider balance check failed silently */ }

  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  const latestRun = jobRuns[0] ?? null;
  const trendMax = Math.max(...jobRuns.map((run) => Number(run.failures || 0)), 1);
  const items = [
    { title: "Kullanici Yonetimi", description: "Musteri ve bayi hesaplarini yonetin.", href: "/admin/users", icon: Users },
    { title: "Servis Yonetimi", description: "Kategori ve servis fiyatlarini duzenleyin.", href: "/admin/services", icon: Package },
    { title: "Duyurular", description: "Dashboard duyurularini ekleyin ve yonetin.", href: "/admin/announcements", icon: Megaphone },
    { title: "Siparis Yonetimi", description: "Tum siparisleri filtreleyip izleyin.", href: "/admin/orders", icon: ShieldCheck },
    { title: "Saglayici Loglari", description: "Senkron ve hata kayitlarini izleyin.", href: "/admin/provider-logs", icon: RadioTower },
    { title: "Sistem Ayarlari", description: "Odeme ve panel ayarlarini guncelleyin.", href: "/admin/settings", icon: Settings2 },
  ];

  // Sağlık uyarıları oluştur
  const healthAlerts: Array<{ level: "error" | "warning" | "ok"; title: string; description: string; href?: string }> = [];

  if (providerBalance !== null && providerBalance < 100) {
    healthAlerts.push({
      level: providerBalance < 20 ? "error" : "warning",
      title: `Sağlayıcı bakiyesi düşük: ${providerBalance.toFixed(2)} TL`,
      description: `${providerName ?? "Sağlayıcı"} hesabına bakiye yükleyin, aksi halde yeni siparişler işlenemez.`,
      href: "/admin/settings/providers",
    });
  }

  if (stuckOrders > 0) {
    healthAlerts.push({
      level: "error",
      title: `${stuckOrders} sipariş sağlayıcıya gönderilemedi`,
      description: "Bu siparişler 30+ dakikadır PENDING durumda ve sağlayıcı hata döndürüyor. Bakiye yüklenince sync çalıştırın.",
      href: "/admin/orders",
    });
  }

  if (pendingTickets > 0) {
    healthAlerts.push({
      level: "warning",
      title: `${pendingTickets} yanıtsız destek talebi`,
      description: "Müşterilerden gelen açık destek talepleri bekliyor.",
      href: "/admin/tickets",
    });
  }

  if (recentErrors > 0) {
    healthAlerts.push({
      level: "warning",
      title: `Son 24 saatte ${recentErrors} sipariş sağlayıcı hatası ile iptal edildi`,
      description: "İptal edilen siparişlere ait iadeler otomatik işlendi. Detaylar için sağlayıcı loglarını kontrol edin.",
      href: "/admin/provider-logs",
    });
  }

  if (healthAlerts.length === 0) {
    healthAlerts.push({
      level: "ok",
      title: "Tüm sistemler normal çalışıyor",
      description: providerBalance !== null ? `Sağlayıcı bakiyesi: ${providerBalance.toFixed(2)} TL` : "Bekleyen uyarı yok.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.66))] p-6 shadow-2xl shadow-primary/10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Admin Command Center</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Tum yonetim modullerine buradan hizli erisin ve panel operasyonlarini tek merkezden yonetin.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">Son scheduler calismasi</p>
            <p className="mt-1 text-xl font-bold">{latestRun ? latestRun.status : "Henuz calismadi"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{latestRun ? latestRun.startedAt.toLocaleString("tr-TR") : "-"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Toplam Kullanici", value: users, icon: Users },
          { title: "Aktif Saglayici", value: providers, icon: RadioTower },
          { title: "Servis Havuzu", value: services, icon: Package },
          { title: "Siparis Hacmi", value: orders, icon: Wallet },
        ].map((stat) => (
          <Card key={stat.title} className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-xl">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              </div>
              <div className="rounded-2xl bg-primary/15 p-3 text-primary"><stat.icon size={24} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Kar / Zarar Analizi Widget ──────────────────────────────── */}
      <AdminProfitWidget />

      {/* ─── Sistem Sağlığı Widget ───────────────────────────────── */}
      <Card className={`border shadow-xl ${healthAlerts[0]?.level === "ok" ? "border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-card" : healthAlerts.some((a) => a.level === "error") ? "border-red-500/30 bg-gradient-to-br from-red-950/30 to-card" : "border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-card"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle size={18} className={healthAlerts[0]?.level === "ok" ? "text-emerald-400" : healthAlerts.some((a) => a.level === "error") ? "text-red-400" : "text-amber-400"} />
            Sistem Sağlığı
            <span className={`ml-auto text-xs font-normal px-2 py-0.5 rounded-full ${healthAlerts[0]?.level === "ok" ? "bg-emerald-500/15 text-emerald-400" : healthAlerts.some((a) => a.level === "error") ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
              {healthAlerts[0]?.level === "ok" ? "Normal" : healthAlerts.some((a) => a.level === "error") ? `${healthAlerts.filter((a) => a.level === "error").length} kritik uyarı` : `${healthAlerts.length} uyarı`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {healthAlerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${alert.level === "ok" ? "border-emerald-500/20 bg-emerald-500/5" : alert.level === "error" ? "border-red-500/25 bg-red-500/8" : "border-amber-500/20 bg-amber-500/8"}`}>
              {alert.level === "ok"
                ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                : alert.level === "error"
                  ? <XCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
                  : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${alert.level === "ok" ? "text-emerald-300" : alert.level === "error" ? "text-red-300" : "text-amber-300"}`}>{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
              </div>
              {alert.href && (
                <Link href={alert.href} className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                  İncele <ArrowRight size={11} />
                </Link>
              )}
            </div>
          ))}
          {/* Hızlı metrikler */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Link href="/admin/tickets" className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 hover:bg-white/5 transition-colors text-center">
              <p className="text-lg font-bold">{pendingTickets}</p>
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5"><Ticket size={10} /> Açık Talep</p>
            </Link>
            <Link href="/admin/orders?status=PENDING" className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 hover:bg-white/5 transition-colors text-center">
              <p className={`text-lg font-bold ${stuckOrders > 0 ? "text-red-400" : ""}`}>{stuckOrders}</p>
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5"><AlertTriangle size={10} /> Takılı Sipariş</p>
            </Link>
            <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-center">
              <p className={`text-lg font-bold ${providerBalance !== null && providerBalance < 50 ? "text-amber-400" : providerBalance !== null && providerBalance < 20 ? "text-red-400" : ""}`}>
                {providerBalance !== null ? `${providerBalance.toFixed(0)}₺` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5"><RadioTower size={10} /> Sağlayıcı Bakiye</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
        <Card className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 size={18} /> Operasyon Ozeti</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-muted-foreground">Senkronlanan</p><p className="mt-2 text-2xl font-bold">{latestRun?.synced || 0}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-muted-foreground">Hata</p><p className="mt-2 text-2xl font-bold">{latestRun?.failures || 0}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-muted-foreground">Toplam Iade</p><p className="mt-2 text-2xl font-bold">{fp(Number(latestRun?.refundedTotal || 0))}</p></div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-gradient-to-br from-primary/10 to-transparent shadow-2xl">
          <CardHeader>
            <CardTitle>Hizli Aksiyonlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Saglayici loglarini filtreleyin, senkronu tetikleyin ve ayarlari tek merkezden yonetin.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/provider-logs"><Card className="border-white/10 bg-white/5 px-4 py-3">Log Merkezi</Card></Link>
              <Link href="/admin/services"><Card className="border-white/10 bg-white/5 px-4 py-3">Servis Import</Card></Link>
              <Link href="/admin/settings"><Card className="border-white/10 bg-white/5 px-4 py-3">Scheduler Ayarlari</Card></Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp size={18} /> Son Senkron Trendleri</CardTitle>
          </CardHeader>
          <CardContent>
            {jobRuns.length === 0 && <p className="text-sm text-muted-foreground">Trend verisi henuz yok.</p>}
            {jobRuns.length > 0 && (
              <div className="grid grid-cols-7 gap-3 items-end h-48">
                {jobRuns.slice().reverse().map((run) => {
                  const failures = Number(run.failures || 0);
                  const synced = Number(run.synced || 0);
                  const height = Math.max(24, Math.round((failures / trendMax) * 160));

                  return (
                    <div key={String(run.id)} className="flex flex-col items-center gap-2">
                      <div className="relative flex h-40 w-full items-end justify-center rounded-2xl border border-white/10 bg-white/5 p-2">
                        <div className="w-full rounded-xl bg-gradient-to-t from-red-500/80 to-orange-400/80" style={{ height }} />
                        <div className="absolute bottom-2 text-[10px] text-white">{failures}</div>
                      </div>
                      <div className="text-center text-[10px] text-muted-foreground">
                        <div>{synced} ok</div>
                        <div>{new Date(String(run.startedAt)).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle size={18} /> Son Hata Akisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobRuns.length === 0 && <p className="text-sm text-muted-foreground">Kayit bulunmuyor.</p>}
            {jobRuns.map((run) => (
              <div key={String(run.id)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="font-medium">{String(run.status)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(String(run.startedAt)).toLocaleString("tr-TR")}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{Number(run.failures || 0)} hata</p>
                  <p className="text-xs text-muted-foreground">{fp(Number(run.refundedTotal || 0))} iade</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full border-white/10 bg-gradient-to-br from-card to-card/70 hover:border-primary/60 hover:-translate-y-1 transition-all shadow-xl">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <item.icon className="text-primary" />
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div className="mt-4 inline-flex items-center text-sm text-primary font-medium">
                  Modulu Ac <ArrowRight size={16} className="ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
