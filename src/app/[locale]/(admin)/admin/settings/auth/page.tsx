import { AlertTriangle, CheckCircle2, KeyRound, Link2, RotateCw, Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getGoogleCallbackUrl, GOOGLE_AUTH_SETTING_KEYS } from "@/lib/auth-settings";
import { saveAuthSettings } from "@/lib/actions/site-actions";
import { getSettings } from "@/lib/settings";
import { googleProviderConfigured } from "@/auth";

function SecretField({ label, name, defaultValue, placeholder }: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-foreground">{label}</Label>
      <Input
        name={name}
        type="password"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="glass border-white/5 font-mono text-foreground"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

export default async function AuthSettingsPage() {
  const settings = await getSettings([...GOOGLE_AUTH_SETTING_KEYS]);
  const callbackUrl = getGoogleCallbackUrl();
  const googleEnabled = settings.auth_google_enabled === "1";
  const hasCredentials = Boolean(settings.auth_google_client_id && settings.auth_google_client_secret);
  const activeNow = googleProviderConfigured && googleEnabled;

  return (
    <div className="space-y-8 font-display">
      <form action={saveAuthSettings}>
        <div className="flex flex-col gap-4 rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] p-6 shadow-2xl shadow-primary/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Kimlik Dogrulama</p>
            <h1 className="mt-2 text-2xl font-bold leading-none tracking-tight sm:text-3xl">Giris Yontemleri</h1>
            <p className="mt-2 text-sm text-muted-foreground">Google OAuth ayarlarini, giris ve kayit ekranlarindaki sosyal girisi yonetin.</p>
          </div>
          <Button type="submit" className="shrink-0 rounded-full px-6 shadow-lg shadow-primary/20">
            <Save size={18} className="mr-2" /> Kaydet
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="glass overflow-hidden border-white/10 shadow-xl">
            <CardHeader className="border-b border-white/5 bg-red-500/5 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg text-foreground">Google ile Giris</CardTitle>
                      {activeNow ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                    </div>
                    <CardDescription>Login ve signup ekranlarinda tek tikla Google hesabi acilir veya giris yapilir.</CardDescription>
                  </div>
                </div>
                <Switch name="auth_google_enabled" defaultChecked={googleEnabled} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Google Client ID</Label>
                  <Input
                    name="auth_google_client_id"
                    defaultValue={settings.auth_google_client_id}
                    placeholder="000000000000-xxxx.apps.googleusercontent.com"
                    className="glass border-white/5 font-mono text-foreground"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <SecretField
                  label="Google Client Secret"
                  name="auth_google_client_secret"
                  defaultValue={settings.auth_google_client_secret}
                  placeholder="GOCSPX-..."
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Ayni e-posta ile hesap eslestirme</p>
                    <p className="mt-1 text-xs text-muted-foreground">Google tarafindan dogrulanan e-posta mevcut kullaniciyla eslesirse hesabi baglar.</p>
                  </div>
                  <Switch name="auth_google_allow_email_linking" defaultChecked={settings.auth_google_allow_email_linking !== "0"} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Google Console Redirect URI</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={callbackUrl} readOnly className="glass border-white/5 font-mono text-xs text-foreground" />
                  <Button type="button" variant="outline" className="gap-2 border-white/10" disabled>
                    <Link2 size={16} /> Kopyala
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Google Cloud Console icinde OAuth Client redirect URI alanina bu adresi ekleyin.</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="glass border-white/10 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck size={18} /> Durum
                </CardTitle>
                <CardDescription>Provider surec basinda yuklenir.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <span className="text-muted-foreground">Ayar aktif</span>
                  {googleEnabled ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-amber-400" />}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <span className="text-muted-foreground">Client bilgileri</span>
                  {hasCredentials ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-amber-400" />}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <span className="text-muted-foreground">Uygulamada yuklu</span>
                  {googleProviderConfigured ? <CheckCircle2 size={18} className="text-emerald-400" /> : <RotateCw size={18} className="text-sky-400" />}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-amber-500/5 shadow-xl">
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertTriangle size={17} /> Yeniden baslatma gerekli
                </div>
                <p className="text-muted-foreground">Client ID veya Secret degistiginde kaydettikten sonra production surecini yeniden baslatin. Yeni provider bilgileri restart sonrasi aktif olur.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}