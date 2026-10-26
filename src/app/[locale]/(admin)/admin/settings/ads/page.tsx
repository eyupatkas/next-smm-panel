import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { saveAdsSettings } from "@/lib/actions/ads-actions";
import { Save, Info, Megaphone, ShieldCheck, Cpu } from "lucide-react";

export default async function AdsSettingsPage() {
  const settings = await getSettings([
    "google_ads_enabled",
    "google_ads_developer_token",
    "google_ads_client_id",
    "google_ads_client_secret",
    "google_ads_refresh_token",
    "google_ads_login_customer_id",
    "meta_ads_enabled",
    "meta_ads_pixel_id",
    "meta_ads_access_token",
  ]);

  return (
    <div className="space-y-8 font-display">
      <form action={saveAdsSettings}>
        {/* Header Section */}
        <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] p-6 flex items-center justify-between gap-4 shadow-2xl shadow-primary/10">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Sistem Yönetimi</p>
            <h1 className="text-3xl font-bold tracking-tight leading-none mt-2">Reklam Ayarları</h1>
            <p className="text-muted-foreground mt-2">Google Ads ve Meta Ads entegrasyon ayarlarını tek bir yerden modüler olarak yönetin.</p>
          </div>
          <Button type="submit" className="rounded-full px-6 shadow-lg shadow-primary/20">
            <Save size={18} className="mr-2" /> Kaydet
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Google Ads Card */}
          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-primary/5 pb-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">Google Ads API</CardTitle>
                    <CardDescription>Google Ads API ve MCP bağlantı ayarları</CardDescription>
                  </div>
                </div>
                <Switch name="google_ads_enabled" defaultChecked={settings.google_ads_enabled === "1"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-foreground">Geliştirici Jetonu (Developer Token)</Label>
                <Input
                  name="google_ads_developer_token"
                  defaultValue={settings.google_ads_developer_token || ""}
                  placeholder="22 karakterlik geliştirici jetonunuz"
                  className="glass border-white/5 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">OAuth2 Client ID</Label>
                <Input
                  name="google_ads_client_id"
                  defaultValue={settings.google_ads_client_id || ""}
                  placeholder="Google Cloud Console OAuth İstemci Kimliği"
                  className="glass border-white/5 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">OAuth2 Client Secret</Label>
                <Input
                  name="google_ads_client_secret"
                  type="password"
                  defaultValue={settings.google_ads_client_secret || ""}
                  placeholder="Google Cloud Console OAuth İstemci Şifresi"
                  className="glass border-white/5 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Refresh Token</Label>
                <Input
                  name="google_ads_refresh_token"
                  defaultValue={settings.google_ads_refresh_token || ""}
                  placeholder="OAuth yetkilendirme yenileme jetonunuz"
                  className="glass border-white/5 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Yönetici Müşteri Kimliği (Manager Customer ID)</Label>
                <Input
                  name="google_ads_login_customer_id"
                  defaultValue={settings.google_ads_login_customer_id || ""}
                  placeholder="Tire olmadan 10 haneli ID (Örn: 1234567890)"
                  className="glass border-white/5 text-foreground"
                />
              </div>
            </CardContent>
          </Card>

          {/* Meta Ads Card */}
          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-sky-500/5 pb-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400">
                    <Cpu size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">Meta Ads & Pixel</CardTitle>
                    <CardDescription>Meta Pixel ve API entegrasyon ayarları (Modüler)</CardDescription>
                  </div>
                </div>
                <Switch name="meta_ads_enabled" defaultChecked={settings.meta_ads_enabled === "1"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-foreground">Meta Pixel ID</Label>
                <Input
                  name="meta_ads_pixel_id"
                  defaultValue={settings.meta_ads_pixel_id || ""}
                  placeholder="Meta Pixel Kimliğiniz"
                  className="glass border-white/5 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">API Erişim Jetonu (Access Token)</Label>
                <Input
                  name="meta_ads_access_token"
                  type="password"
                  defaultValue={settings.meta_ads_access_token || ""}
                  placeholder="Conversion API veya Reklam Yöneticisi Jetonu"
                  className="glass border-white/5 text-foreground"
                />
              </div>
              
              <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 flex gap-3">
                <div className="text-sky-400 mt-0.5 shrink-0">
                  <Info size={18} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Meta Ads alanı şu an gelecekteki geliştirmeler için modüler olarak tasarlanmıştır. Ayarları doldurup kaydettiğinizde veritabanında saklanır ve Meta Ads API entegrasyonları tamamlandığında otomatik olarak devreye girer.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Notification */}
        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-4">
          <div className="text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-400">Güvenlik ve Senkronizasyon Uyarısı</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Google Ads ayarlarını güncelleyip kaydettiğinizde, sunucudaki <code>/root/google-ads.yaml</code> dosyası otomatik olarak bu bilgilerle güncellenecektir. Bu sayede MCP sunucunuz (AI Agent ve CLI araçları) hiçbir manuel işlem gerektirmeden yeni kimlik bilgilerinizi kullanarak Google Ads API'sine bağlanabilecektir.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
