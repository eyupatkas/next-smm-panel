import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { savePricingSettings } from "@/lib/actions/pricing-actions";
import { PricingSyncButton } from "./pricing-sync-button";
import { Save, ShieldAlert, Percent } from "lucide-react";

export default async function PricingSettingsPage() {
  const settings = await getSettings(["pricing_guard_enabled", "pricing_min_profit_percent"]);
  const enabled = settings.pricing_guard_enabled !== "0";
  const percent = settings.pricing_min_profit_percent || "100";

  return (
    <div className="space-y-8 font-display">
      <form action={savePricingSettings}>
        <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] p-6 flex items-center justify-between gap-4 shadow-2xl shadow-primary/10">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Gelir Koruma</p>
            <h1 className="text-3xl font-bold tracking-tight leading-none mt-2">Zarar Önleyici Fiyatlandırma</h1>
            <p className="text-muted-foreground mt-2">
              Paket fiyatı maliyetin altına düşerse veya yeterli kârı getirmiyorsa otomatik taban uygulanır.
            </p>
          </div>
          <Button type="submit" className="rounded-full px-6 shadow-lg shadow-primary/20">
            <Save size={18} className="mr-2" /> Kaydet
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-primary/5 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Zarar Önleyici</CardTitle>
                  <CardDescription>Checkout, paket sayfaları ve anasayfa bu tabanı kullanır</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="pricing_guard_enabled" className="text-foreground">Zarar Önleyici Aktif</Label>
                  <p className="text-xs text-muted-foreground">
                    Kapalıysa taban uygulanmaz (yalnızca mevcut maliyet koruması çalışır).
                  </p>
                </div>
                <Switch id="pricing_guard_enabled" name="pricing_guard_enabled" defaultChecked={enabled} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricing_min_profit_percent" className="flex items-center gap-2 text-foreground">
                  <Percent size={14} /> Minimum Kâr Oranı (%)
                </Label>
                <Input
                  id="pricing_min_profit_percent"
                  name="pricing_min_profit_percent"
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  defaultValue={percent}
                  className="glass border-white/5 text-foreground max-w-[180px]"
                />
                <p className="text-xs text-muted-foreground">
                  Örnek: %100 iken maliyeti 20 ₺ olan paket en az 40 ₺'ye satılır. Fiyat tabanın altındaysa
                  sistem otomatik olarak tabana (maliyet + bu kâr) yükseltir.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-emerald-500/5 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <Percent size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Toplu Uygulama</CardTitle>
                  <CardDescription>Kayıtlı paket fiyatlarını tek seferde tabana çek</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sitede gösterilen ve ödemede tahsil edilen perakende fiyat, seçtiğiniz min kâr oranının
                altındaysa veritabanında tabana yükseltilir. Bayi fiyatları da aynı tabandan kontrol edilir.
              </p>
              <PricingSyncButton disabled={!enabled} />
              <p className="text-xs text-muted-foreground">
                Not: Ayarı kaydettikten sonra bu butonu kullanın. Anlık koruma (checkout) ayar kaydedilince
                tüm siparişlerde otomatik geçerli olur.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
