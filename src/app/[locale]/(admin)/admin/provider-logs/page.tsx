import { db } from "@/lib/db";
import { findJobRunsSafe, hasJobRunModel } from "@/lib/job-runs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSchedulerSettings } from "@/lib/settings";
import { syncOrderWithProviderAdmin, syncProviderOrdersBatchAdmin } from "@/lib/actions/admin-actions";
import { SchedulerRunNowCard } from "@/components/admin/SchedulerRunNowCard";
import { JobRunDetailsDialog } from "@/components/admin/JobRunDetailsDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLocale } from "next-intl/server";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";

function variantFromStatus(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "PROCESSING" || status === "PENDING") return "secondary";
  if (status === "CANCELED" || status === "REFUNDED" || status === "PARTIAL") return "destructive";
  return "outline";
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    COMPLETED: "bg-emerald-400",
    PROCESSING: "bg-blue-400",
    PENDING: "bg-yellow-400",
    PARTIAL: "bg-orange-400",
    CANCELED: "bg-red-400",
    REFUNDED: "bg-purple-400",
  };
  return map[status] ?? "bg-muted-foreground";
}

const FILTER_TABS = [
  { value: "all",      label: "Tüm Kayıtlar" },
  { value: "errors",   label: "Sadece Hata" },
  { value: "partial",  label: "Kısmi" },
  { value: "canceled", label: "İptal" },
];

export default async function ProviderLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; provider?: string; from?: string; to?: string }>;
}) {
  const params = (await searchParams) || {};
  const filter = typeof params.filter === "string" ? params.filter : "all";
  const provider = typeof params.provider === "string" ? params.provider : "all";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const schedulerSettings = await getSchedulerSettings();

  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  const providers = await db.provider.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59`) : null;

  const where = {
    service: {
      providerId: {
        ...(provider === "all" ? { not: null } : { equals: provider }),
      },
    },
    ...(fromDate || toDate
      ? {
          updatedAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(filter === "errors"
      ? { error: { not: null } }
      : filter === "partial"
        ? { status: "PARTIAL" as const }
        : filter === "canceled"
          ? { status: "CANCELED" as const }
          : {
              OR: [{ error: { not: null } }, { apiOrderId: { not: null } }],
            }),
  };

  const logs = await db.order.findMany({
    where,
    select: {
      id: true,
      status: true,
      apiOrderId: true,
      error: true,
      charge: true,
      quantity: true,
      remains: true,
      startCount: true,
      updatedAt: true,
      createdAt: true,
      service: {
        select: {
          name: true,
          externalId: true,
          provider: { select: { name: true } },
        },
      },
      user: { select: { email: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const jobRuns = await findJobRunsSafe({
    where: { jobName: "provider-sync" },
    orderBy: { startedAt: "desc" },
    take: 15,
  });

  const latestRun = jobRuns[0];

  async function runNowAction(formData: FormData) {
    "use server";
    await syncProviderOrdersBatchAdmin(formData);
  }

  async function retryOrderAction(formData: FormData) {
    "use server";
    await syncOrderWithProviderAdmin(formData);
  }

  const csvParams = new URLSearchParams();
  if (filter !== "all") csvParams.set("filter", filter);
  if (provider !== "all") csvParams.set("provider", provider);
  if (from) csvParams.set("from", from);
  if (to) csvParams.set("to", to);
  const exportHref = `/api/admin/provider-logs/export${csvParams.toString() ? `?${csvParams.toString()}` : ""}`;

  const errCount = logs.filter((l) => l.error && l.error !== "awaiting_payment").length;
  const partialCount = logs.filter((l) => l.status === "PARTIAL").length;
  const canceledCount = logs.filter((l) => l.status === "CANCELED").length;
  const processingCount = logs.filter((l) => l.status === "PROCESSING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sağlayıcı Logları</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            API siparişleri, hata geçmişi ve scheduler çalışma kayıtları.
          </p>
        </div>
        <Link href={exportHref}>
          <Button variant="outline" size="sm">CSV Dışa Aktar</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Toplam Kayıt", value: logs.length, color: "text-foreground" },
          { label: "Hatalı", value: errCount, color: "text-red-400" },
          { label: "İşleniyor", value: processingCount, color: "text-blue-400" },
          { label: "Kısmi / İptal", value: partialCount + canceledCount, color: "text-orange-400" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.06] bg-white/[0.02]">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduler info */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex flex-col gap-2 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-foreground">Dahili Scheduler Aktif</p>
            <p className="text-sm">Uygulama başlangıcında otomatik devreye girer, harici cron gerekmez.</p>
          </div>
          <div className="flex gap-4 text-xs">
            <span>Aralık: <strong>{Math.round(schedulerSettings.intervalMs / 1000)} sn</strong></span>
            <span>Batch: <strong>{schedulerSettings.batchLimit}</strong></span>
            <span>JobRun: <strong>{hasJobRunModel() ? "✓ Hazır" : "Yeniden başlat gerekli"}</strong></span>
          </div>
        </CardContent>
      </Card>

      <SchedulerRunNowCard
        batchLimit={schedulerSettings.batchLimit}
        runAction={runNowAction}
        lastRunLabel={
          latestRun
            ? `${latestRun.startedAt.toLocaleString("tr-TR")} · ${latestRun.status}`
            : undefined
        }
      />

      {/* Filtreler */}
      <Card className="border-white/10">
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => {
              const href = new URLSearchParams({
                filter: tab.value,
                ...(provider !== "all" ? { provider } : {}),
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
              });
              return (
                <Link key={tab.value} href={`/admin/provider-logs?${href.toString()}`}>
                  <Button variant={filter === tab.value ? "default" : "outline"} size="sm">
                    {tab.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <form className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="filter" value={filter} />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Sağlayıcı</label>
              <select
                name="provider"
                defaultValue={provider}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-40"
              >
                <option value="all">Tümü</option>
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Başlangıç</label>
              <input name="from" type="date" defaultValue={from} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bitiş</label>
              <input name="to" type="date" defaultValue={to} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" size="sm">Filtrele</Button>
              <Link href="/admin/provider-logs">
                <Button type="button" variant="ghost" size="sm">Sıfırla</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Scheduler geçmişi */}
      <Card className="border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Scheduler Çalışma Geçmişi (son 15)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobRuns.length === 0 ? (
            <p className="px-6 py-5 text-sm text-muted-foreground">Henüz çalışma kaydı yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Tetik</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Tara</TableHead>
                  <TableHead className="text-right">Sync</TableHead>
                  <TableHead className="text-right">Hata</TableHead>
                  <TableHead className="text-right">İade</TableHead>
                  <TableHead className="text-right">Detay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-sm">{run.startedAt.toLocaleString("tr-TR")}</TableCell>
                    <TableCell><Badge variant="outline">{run.trigger}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={run.status === "SUCCESS" ? "default" : run.status === "PARTIAL" ? "secondary" : "destructive"}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{run.scanned}</TableCell>
                    <TableCell className="text-right tabular-nums">{run.synced}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-400">{run.failures || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fp(Number(run.refundedTotal))}</TableCell>
                    <TableCell className="text-right"><JobRunDetailsDialog details={run.details} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sipariş logları */}
      <Card className="border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Son 100 Sipariş Kaydı</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="px-6 py-5 text-sm text-muted-foreground">Bu filtreye ait kayıt bulunamadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş</TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Sağlayıcı / Servis</TableHead>
                    <TableHead>API No</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Miktar / Tutar</TableHead>
                    <TableHead>Hata</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className={log.error && log.error !== "awaiting_payment" ? "bg-red-500/[0.03]" : undefined}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-mono text-xs font-medium">#{log.id.slice(-8).toUpperCase()}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Oluşturuldu: {new Date(log.createdAt).toLocaleDateString("tr-TR")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Güncellendi: {new Date(log.updatedAt).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.user.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <p className="font-medium">{log.service.provider?.name ?? "—"}</p>
                          <p className="text-muted-foreground">{log.service.name}</p>
                          {log.service.externalId && (
                            <p className="text-muted-foreground/60">Ext: {log.service.externalId}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          {log.apiOrderId ? (
                            <p className="font-mono">{log.apiOrderId}</p>
                          ) : (
                            <p className="text-yellow-500/70">Yok</p>
                          )}
                          {log.startCount > 0 && (
                            <p className="text-muted-foreground">Başl: {log.startCount}</p>
                          )}
                          {log.remains > 0 && (
                            <p className="text-muted-foreground">Kalan: {log.remains}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${statusDot(log.status)}`} />
                          <Badge variant={variantFromStatus(log.status)} className="text-xs">
                            {log.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-0.5 text-xs">
                          <p className="tabular-nums font-medium">{fp(Number(log.charge))}</p>
                          <p className="text-muted-foreground tabular-nums">{log.quantity.toLocaleString("tr-TR")} adet</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-52">
                        {log.error && log.error !== "awaiting_payment" ? (
                          <pre className="overflow-x-auto rounded border border-red-500/20 bg-red-500/5 p-2 text-[10px] text-red-400 whitespace-pre-wrap break-all">
                            {log.error.slice(0, 180)}{log.error.length > 180 ? "…" : ""}
                          </pre>
                        ) : log.error === "awaiting_payment" ? (
                          <span className="text-xs text-amber-400">Ödeme bekleniyor</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={retryOrderAction}>
                          <input type="hidden" name="id" value={log.id} />
                          <Button type="submit" size="sm" variant="outline" className="h-7 text-xs px-2">
                            Yeniden Dene
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
