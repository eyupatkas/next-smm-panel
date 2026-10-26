import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { saveSiteSettings } from "@/lib/actions/site-actions";
import { Globe, Mail, Phone, Image, Bell, Save, Share2, Languages, Coins, MessageCircle } from "lucide-react";
import { locales, localeNames } from "@/i18n/routing";
import { localeCurrencyMap } from "@/lib/currency";

export default async function SiteSettingsPage() {
  const settings = await getSettings([
    "site_name",
    "site_description",
    "site_keywords",
    "site_logo_url",
    "site_favicon_url",
    "site_contact_email",
    "site_contact_phone",
    "site_social_instagram",
    "site_social_twitter",
    "site_social_telegram",
    "site_announcement",
    "site_announcement_enabled",
    "whatsapp_button_enabled",
    "default_locale",
    "default_currency",
    "multi_language_enabled",
    "multi_currency_enabled",
    "auto_detect_locale",
  ]);

  return (
    <div className="space-y-8 font-display">
      <form action={saveSiteSettings}>
        <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] p-6 flex items-center justify-between gap-4 shadow-2xl shadow-primary/10">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Site Yönetimi</p>
            <h1 className="text-3xl font-bold tracking-tight leading-none mt-2">Site Ayarları</h1>
            <p className="text-muted-foreground mt-2">Site adı, açıklaması, iletişim ve sosyal medya bilgilerini yönetin.</p>
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
                  <Globe size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Genel Bilgiler</CardTitle>
                  <CardDescription>Site adı ve SEO açıklaması</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-foreground">Site Adı</Label>
                <Input name="site_name" defaultValue={settings.site_name || "OptiSMM"} placeholder="OptiSMM" className="glass border-white/5 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Site Açıklaması</Label>
                <Input name="site_description" defaultValue={settings.site_description} placeholder="Sosyal medya hizmetleri paneli" className="glass border-white/5 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Anahtar Kelimeler (virgülle ayır)</Label>
                <Input name="site_keywords" defaultValue={settings.site_keywords} placeholder="smm panel, sosyal medya, takipçi" className="glass border-white/5 text-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-sky-500/5 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400">
                  <Image size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Görsel Ayarları</CardTitle>
                  <CardDescription>Logo ve favicon URL</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-foreground">Logo URL</Label>
                <Input name="site_logo_url" defaultValue={settings.site_logo_url} placeholder="/images/logo.png" className="glass border-white/5 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Favicon URL</Label>
                <Input name="site_favicon_url" defaultValue={settings.site_favicon_url} placeholder="/favicon.ico" className="glass border-white/5 text-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-emerald-500/5 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <Mail size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">İletişim Bilgileri</CardTitle>
                  <CardDescription>E-posta ve telefon</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-foreground">E-posta</Label>
                <Input name="site_contact_email" type="email" defaultValue={settings.site_contact_email} placeholder="info@smmpro.com" className="glass border-white/5 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Telefon</Label>
                <Input name="site_contact_phone" defaultValue={settings.site_contact_phone} placeholder="+90 555 000 0000" className="glass border-white/5 text-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-purple-500/5 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                  <Share2 size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Sosyal Medya</CardTitle>
                  <CardDescription>Sosyal medya hesap linkleri</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-foreground">Instagram</Label>
                <Input name="site_social_instagram" defaultValue={settings.site_social_instagram} placeholder="https://instagram.com/smmpro" className="glass border-white/5 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Twitter / X</Label>
                <Input name="site_social_twitter" defaultValue={settings.site_social_twitter} placeholder="https://x.com/smmpro" className="glass border-white/5 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Telegram</Label>
                <Input name="site_social_telegram" defaultValue={settings.site_social_telegram} placeholder="https://t.me/smmpro" className="glass border-white/5 text-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass border-white/10 shadow-xl overflow-hidden mt-8">
          <CardHeader className="bg-orange-500/5 pb-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400">
                  <Bell size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Duyuru Bandı</CardTitle>
                  <CardDescription>Sitenin üstünde görünen duyuru mesajı</CardDescription>
                </div>
              </div>
              <Switch name="site_announcement_enabled" defaultChecked={settings.site_announcement_enabled === "1"} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="text-foreground">Duyuru Mesajı</Label>
              <Input name="site_announcement" defaultValue={settings.site_announcement} placeholder="Hoş geldiniz! Yeni hizmetlerimizi keşfedin." className="glass border-white/5 text-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Butonu */}
        <Card className="glass border-white/10 shadow-xl overflow-hidden mt-8">
          <CardHeader className="bg-green-500/5 pb-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">WhatsApp Butonu</CardTitle>
                  <CardDescription>Sağ alt köşedeki WhatsApp iletişim butonu</CardDescription>
                </div>
              </div>
              <Switch name="whatsapp_button_enabled" defaultChecked={settings.whatsapp_button_enabled !== "0"} />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Kapatıldığında sitedeki sabit WhatsApp butonu ve footer&apos;daki WhatsApp linki gizlenir.</p>
          </CardContent>
        </Card>

        {/* Language & Currency Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-indigo-500/5 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <Languages size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Dil Ayarları</CardTitle>
                  <CardDescription>Varsayılan dil ve çoklu dil desteği</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-foreground">Varsayılan Dil</Label>
                <select name="default_locale" defaultValue={settings.default_locale || "tr"} className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                  {locales.map((loc) => (
                    <option key={loc} value={loc}>{localeNames[loc]} ({loc})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Çoklu Dil Desteği</p>
                  <p className="text-xs text-muted-foreground">Devre dışı bırakırsanız site yalnızca varsayılan dilde çalışır</p>
                </div>
                <Switch name="multi_language_enabled" defaultChecked={settings.multi_language_enabled !== "0"} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Otomatik Dil Algılama</p>
                  <p className="text-xs text-muted-foreground">Ziyaretçinin IP/tarayıcı diline göre otomatik dil seçimi</p>
                </div>
                <Switch name="auto_detect_locale" defaultChecked={settings.auto_detect_locale !== "0"} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-amber-500/5 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                  <Coins size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Para Birimi Ayarları</CardTitle>
                  <CardDescription>Varsayılan para birimi ve çoklu para birimi desteği</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-foreground">Varsayılan Para Birimi</Label>
                <select name="default_currency" defaultValue={settings.default_currency || "TRY"} className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                  {Object.entries(localeCurrencyMap).map(([loc, cur]) => (
                    <option key={`${loc}-${cur.code}`} value={cur.code}>{cur.symbol} {cur.code} ({localeNames[loc as keyof typeof localeNames]})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Çoklu Para Birimi</p>
                  <p className="text-xs text-muted-foreground">Devre dışı bırakırsanız tüm fiyatlar varsayılan para biriminde gösterilir</p>
                </div>
                <Switch name="multi_currency_enabled" defaultChecked={settings.multi_currency_enabled !== "0"} />
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
