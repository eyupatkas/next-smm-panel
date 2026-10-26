import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateProviderAdmin } from "@/lib/actions/admin-provider-actions";
import { AddProviderDialog } from "@/components/admin/AddProviderDialog";
import { ProviderImportDialog } from "@/components/admin/ProviderImportDialog";
import { DatabaseZap, Percent, PlugZap, Sparkles } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";

export default async function AdminSettingsProvidersPage() {
  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  const providers = await db.provider.findMany({
    select: {
      id: true,
      name: true,
      apiUrl: true,
      balance: true,
      status: true,
      baseCurrency: true,
      createdAt: true,
      retailMarkupPercent: true,
      resellerMarkupPercent: true,
      categoryNamePrefix: true,
      serviceNamePrefix: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.2),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] p-6 shadow-2xl shadow-sky-500/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-300">Provider Hub</p>
            <h1 className="text-3xl font-bold tracking-tight mt-2">Saglayicilar</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
              Saglayici ekleyin, guncelleyin ve API&apos;den servisleri toplu cekin.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-muted-foreground">Toplam</p>
              <p className="mt-1 text-2xl font-bold">{providers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-muted-foreground">Aktif</p>
              <p className="mt-1 text-2xl font-bold">{providers.filter((p) => p.status).length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-muted-foreground">Bakiye</p>
              <p className="mt-1 text-2xl font-bold">{providers.reduce((s, p) => s + p.balance, 0).toFixed(0)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-muted-foreground">Sync</p>
              <p className="mt-1 text-2xl font-bold">Canli</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent shadow-xl">
          <CardContent className="flex items-center gap-4 p-6">
            <PlugZap className="text-sky-400" />
            <div>
              <p className="text-sm text-muted-foreground">Bagli API&apos;ler</p>
              <p className="text-2xl font-bold">{providers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-xl">
          <CardContent className="flex items-center gap-4 p-6">
            <DatabaseZap className="text-emerald-400" />
            <div>
              <p className="text-sm text-muted-foreground">Toplu Cekim</p>
              <p className="text-2xl font-bold">Hazir</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-transparent shadow-xl">
          <CardContent className="flex items-center gap-4 p-6">
            <Sparkles className="text-fuchsia-400" />
            <div>
              <p className="text-sm text-muted-foreground">Yuvarlama Motoru</p>
              <p className="text-2xl font-bold">Aktif</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Modals */}
      <div className="flex flex-wrap gap-3">
        <AddProviderDialog />
        <ProviderImportDialog providers={providers} />
      </div>

      {/* Provider Cards */}
      <div className="grid gap-6">
        {providers.length === 0 && (
          <p className="text-muted-foreground">Saglayici bulunamadi.</p>
        )}
        {providers.map((p) => (
          <Card key={p.id} className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <PlugZap size={18} className="text-sky-400" />
                  {p.name}
                </span>
                <Badge variant={p.status ? "default" : "secondary"}>{p.status ? "Aktif" : "Pasif"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form id={`prov-${p.id}`} action={updateProviderAdmin}>
                <input type="hidden" name="id" value={p.id} />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Ad */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad</label>
                    <Input name="name" defaultValue={p.name} className="h-9" />
                  </div>
                  {/* API URL */}
                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">API URL</label>
                    <Input name="apiUrl" defaultValue={p.apiUrl} className="h-9" />
                  </div>
                  {/* API Key */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">API Anahtarı (boş = değişmez)</label>
                    <Input name="apiKey" placeholder="Yeni anahtar girin" className="h-9" />
                  </div>
                  {/* Base Currency */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fiyat Para Birimi</label>
                    <select
                      name="baseCurrency"
                      defaultValue={p.baseCurrency}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="USD">USD</option>
                      <option value="TRY">TRY</option>
                    </select>
                    <p className="text-xs text-muted-foreground">API rate degerinin para birimi.</p>
                  </div>
                  {/* Category Prefix */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kategori On Eki</label>
                    <Input name="categoryNamePrefix" defaultValue={p.categoryNamePrefix} placeholder="Orn: Bayievi" className="h-9" />
                    <p className="text-xs text-muted-foreground">Platform ve alt kategori adlarinin basina eklenir.</p>
                  </div>
                  {/* Service Prefix */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Servis On Eki</label>
                    <Input name="serviceNamePrefix" defaultValue={p.serviceNamePrefix} placeholder="Orn: Bayievi" className="h-9" />
                    <p className="text-xs text-muted-foreground">Servis adlarinin basina eklenir.</p>
                  </div>
                  {/* Retail Markup */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Percent size={11} /> Perakende Kar Oranı %
                    </label>
                    <div className="relative">
                      <Input
                        name="retailMarkupPercent"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={p.retailMarkupPercent}
                        className="h-9 pr-8"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Maliyet × {(1 + p.retailMarkupPercent / 100).toFixed(2)}x — perakende satış fiyatı</p>
                  </div>
                  {/* Reseller Markup */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Percent size={11} /> Bayi Kar Oranı %
                    </label>
                    <div className="relative">
                      <Input
                        name="resellerMarkupPercent"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={p.resellerMarkupPercent}
                        className="h-9 pr-8"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Maliyet × {(1 + p.resellerMarkupPercent / 100).toFixed(2)}x — bayi satış fiyatı</p>
                  </div>
                  {/* Status + Bakiye + Submit */}
                  <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" name="status" defaultChecked={p.status} className="h-4 w-4" />
                        <span>Aktif</span>
                      </label>
                      <span className="text-sm text-muted-foreground">
                        Bakiye: <span className="font-semibold text-foreground">{fp(Number(p.balance))}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Eklenme: {p.createdAt.toLocaleDateString("tr-TR")}</span>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-400">
                      ⚠️ Kar oranı veya ön ek değiştiğinde kaydetmeniz yeterli; mevcut isimler hemen güncellenir. Sonraki &quot;Servisleri Çek / Yenile&quot; ve otomatik sync aynı ön eklerle devam eder.
                    </div>
                    <Button type="submit" size="sm" className="w-fit">Kaydet</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
