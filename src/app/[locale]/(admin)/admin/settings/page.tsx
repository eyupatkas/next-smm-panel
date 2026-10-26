import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Save, RadioTower, Gauge, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { saveAdminSettings } from "@/lib/actions/admin-actions";

function FieldRow({ label, name, defaultValue, placeholder, hint, type = "text" }: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        type={type}
        className="h-9 bg-white/[0.03] border-white/10 text-sm font-mono"
        autoComplete="off"
        spellCheck={false}
      />
      {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

export default async function AdminSettingsPage() {
  const settings = await getSettings([
    "provider_sync_interval_ms",
    "provider_sync_batch_limit",
    "retail_markup_percent",
    "reseller_markup_percent",
    "service_sync_interval_hours",
    "usd_to_try_rate",
  ]);

  return (
    <div className="space-y-8">
      <form action={saveAdminSettings}>

        {/* Header */}
        <div className="rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] p-6 flex items-center justify-between gap-4 shadow-2xl shadow-primary/10 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Operasyon Merkezi</p>
            <h1 className="text-2xl font-bold tracking-tight leading-none mt-2">Sistem Ayarları</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Scheduler, fiyatlandırma ve altyapı ayarlarını tek ekrandan yönetin.</p>
          </div>
          <Button type="submit" className="rounded-full px-6 gap-2 shadow-lg shadow-primary/20 shrink-0">
            <Save size={16} /> Kaydet
          </Button>
        </div>

        {/* İstatistik kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-white/10 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-primary/15 p-3 text-primary"><Gauge size={22} /></div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduler Batch</p>
                <p className="text-2xl font-bold">{settings.provider_sync_batch_limit || "25"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-sky-500/15 p-3 text-sky-400"><RadioTower size={22} /></div>
              <div>
                <p className="text-xs text-muted-foreground">Sync Aralığı</p>
                <p className="text-2xl font-bold">{Math.round(Number(settings.provider_sync_interval_ms || 60000) / 1000)} sn</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-400"><TrendingUp size={22} /></div>
              <div>
                <p className="text-xs text-muted-foreground">Markup (Retail)</p>
                <p className="text-2xl font-bold">%{settings.retail_markup_percent || "200"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fiyat Markup */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Otomatik Fiyat Artışı</h2>
          <Card className="border-white/10">
            <CardHeader className="pb-4 border-b border-white/8 bg-gradient-to-r from-emerald-500/8 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Servis Fiyat Markup</CardTitle>
                  <CardDescription className="text-xs">Sağlayıcıdan çekilen ham fiyata otomatik eklenen kar oranı. Yeni sync'te uygulanır.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-5">
              <FieldRow
                label="Perakende Artış (%)"
                name="retail_markup_percent"
                defaultValue={settings.retail_markup_percent || "200"}
                placeholder="200"
                hint="Perakende müşteri fiyatı: baz fiyat × (1 + %200) = 3×"
              />
              <FieldRow
                label="Bayi Artış (%)"
                name="reseller_markup_percent"
                defaultValue={settings.reseller_markup_percent || "100"}
                placeholder="100"
                hint="Bayi fiyatı: baz fiyat × (1 + %100) = 2×"
              />
              <FieldRow
                label="USD → TRY Kuru"
                name="usd_to_try_rate"
                defaultValue={settings.usd_to_try_rate || "35.0"}
                placeholder="35.0"
                hint="BulkFollows, JustAnotherPanel (USD) fiyatları bu kurla TRY'ye çevrilir"
              />
            </CardContent>
          </Card>
        </div>

        {/* Scheduler */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Gömülü Scheduler</h2>
          <Card className="border-white/10">
            <CardHeader className="pb-4 border-b border-white/8 bg-gradient-to-r from-sky-500/8 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Sağlayıcı Senkron Ayarları</CardTitle>
                  <CardDescription className="text-xs">
                    Uygulama başladığında çalışan 2 arka plan işi: <strong>Sipariş Sync</strong> (provider durumlarını günceller) ve <strong>Servis Sync</strong> (fiyat/liste günceller).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-5">
              <FieldRow
                label="Sipariş Sync Aralığı (ms)"
                name="provider_sync_interval_ms"
                defaultValue={settings.provider_sync_interval_ms || "60000"}
                placeholder="60000"
                hint="Bekleyen siparişlerin durumu kaç ms'de bir kontrol edilir? (min. 15000)"
              />
              <FieldRow
                label="Sipariş Batch Limiti"
                name="provider_sync_batch_limit"
                defaultValue={settings.provider_sync_batch_limit || "25"}
                placeholder="25"
                hint="Her döngüde işlenecek maks. sipariş sayısı (1–100)"
              />
              <FieldRow
                label="Servis Sync Aralığı (saat)"
                name="service_sync_interval_hours"
                defaultValue={settings.service_sync_interval_hours || "6"}
                placeholder="6"
                hint="Sağlayıcı servis listesi/fiyatları kaç saatte bir güncellenir?"
              />
            </CardContent>
          </Card>
        </div>

      </form>
    </div>
  );
}

