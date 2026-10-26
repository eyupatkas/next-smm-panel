import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ShoppingBag, Save, CheckCircle2, Circle, Coins, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { savePaymentSettings } from "@/lib/actions/admin-actions";

function ProviderCard({
  title,
  description,
  icon,
  accentClass,
  iconBgClass,
  enabled,
  name,
  badge,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  iconBgClass: string;
  enabled: boolean;
  name: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`border-white/10 overflow-hidden transition-all ${enabled ? "shadow-lg" : "opacity-70 hover:opacity-100"}`}>
      <CardHeader className={`pb-4 border-b border-white/8 bg-gradient-to-r ${accentClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgClass}`}>
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{title}</CardTitle>
                {badge && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{badge}</Badge>}
                {enabled
                  ? <CheckCircle2 size={13} className="text-emerald-400" />
                  : <Circle size={13} className="text-muted-foreground/40" />}
              </div>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <Switch name={name} defaultChecked={enabled} />
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-3">
        {children}
      </CardContent>
    </Card>
  );
}

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

export default async function AdminSettingsPaymentsPage() {
  const settings = await getSettings([
    "paytr_enabled",
    "paytr_test_mode",
    "paytr_merchant_id",
    "paytr_merchant_key",
    "paytr_merchant_salt",
    "shopier_enabled",
    "shopier_api_key",
    "shopier_api_secret",
    "iyzico_enabled",
    "iyzico_api_key",
    "iyzico_secret_key",
    "iyzico_base_url",
    "cryptomus_enabled",
    "cryptomus_merchant_id",
    "cryptomus_api_key",
    "polar_enabled",
    "polar_api_key",
    "polar_product_id",
    "polar_webhook_secret",
    "bank_transfer_enabled",
    "bank_transfer_iban",
    "bank_transfer_holder",
    "bank_transfer_bank",
    "vat_rate",
  ]);

  const activePayments = [
    false,
    false,
    false,
    settings.cryptomus_enabled === "1",
    false,
    (settings.bank_transfer_enabled || "1") === "1",
  ].filter(Boolean).length;

  return (
    <div className="space-y-8">
      <form action={savePaymentSettings}>

        {/* Header */}
        <div className="rounded-2xl border border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] p-6 flex items-center justify-between gap-4 shadow-2xl shadow-emerald-500/10 mb-8">
          <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-400/80">Finans Merkezi</p>
            <h1 className="text-2xl font-bold tracking-tight leading-none mt-2">Ödeme Ayarları</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Tüm ödeme sağlayıcılarını tek ekrandan yapılandırın.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Aktif Yöntem</p>
                <p className="text-2xl font-bold text-emerald-400">{activePayments} / 2</p>
            </div>
            <Button type="submit" className="rounded-full px-6 gap-2 shadow-lg shadow-emerald-500/20 shrink-0">
              <Save size={16} /> Kaydet
            </Button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
          Yeni ödemelerde kart sağlayıcıları (PayTR, iyzico, Shopier ve Polar) kapalıdır. Havale / EFT ile Cryptomus dışındaki ödeme seçenekleri sunulmaz.
        </div>

        {/* Ödeme Sağlayıcıları */}
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Ödeme Yöntemleri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <ProviderCard
              title="Havale / EFT"
              description="Bakiye yükleme · En az 500 ₺ · Yönetici onaylı"
              icon={<CreditCard size={20} className="text-emerald-400" />}
              accentClass="from-emerald-500/10 to-transparent"
              iconBgClass="bg-emerald-500/15"
              enabled={(settings.bank_transfer_enabled || "1") === "1"}
              name="bank_transfer_enabled"
              badge="Banka"
            >
              <FieldRow label="Hesap sahibi" name="bank_transfer_holder" defaultValue={settings.bank_transfer_holder || "Eyüp Aktaş"} />
              <FieldRow label="Banka" name="bank_transfer_bank" defaultValue={settings.bank_transfer_bank || "Enpara bank"} />
              <FieldRow label="IBAN" name="bank_transfer_iban" defaultValue={settings.bank_transfer_iban || "TR79 0015 7000 0000 0128 4138 92"} />
              <p className="text-[11px] text-muted-foreground">Havale talebi oluşturulunca kullanıcıya bu hesap bilgileri ve ödeme açıklaması gösterilir. Bakiye, Finans sayfasından manuel onay sonrası yüklenir.</p>
            </ProviderCard>

            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="text-base">KDV ve satış fiyatları</CardTitle>
                <CardDescription>Servis ve paket tutarları KDV hariç girilir; sipariş toplamına bu oran eklenir.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldRow label="KDV oranı (%)" name="vat_rate" type="number" defaultValue={settings.vat_rate || "20"} placeholder="20" hint="0–100 arası. Varsayılan: %20." />
              </CardContent>
            </Card>

            {/* PayTR */}
            <ProviderCard
              title="PayTR"
              description="Kredi Kartı · Havale / EFT"
              icon={<CreditCard size={20} className="text-blue-400" />}
              accentClass="from-blue-500/10 to-transparent"
              iconBgClass="bg-blue-500/15"
              enabled={false}
              name="paytr_enabled"
            >
              <FieldRow label="Merchant ID" name="paytr_merchant_id" defaultValue={settings.paytr_merchant_id} placeholder="123456" />
              <FieldRow label="Merchant Key" name="paytr_merchant_key" defaultValue={settings.paytr_merchant_key} placeholder="XXXXXXXXXXXXXXXXXXXX" type="password" />
              <FieldRow label="Merchant Salt" name="paytr_merchant_salt" defaultValue={settings.paytr_merchant_salt} placeholder="XXXXXXXXXXXXXXXX" type="password" />
              <div className="flex items-center justify-between pt-2 border-t border-white/8">
                <div>
                  <p className="text-xs font-medium">Test Modu</p>
                  <p className="text-[11px] text-muted-foreground/60">
                    {settings.paytr_test_mode === "1"
                      ? "⚠️ Test modu aktif — gerçek ödeme alınmaz"
                      : "✅ Canlı mod — gerçek ödemeler işleniyor"}
                  </p>
                </div>
                <Switch name="paytr_test_mode" defaultChecked={settings.paytr_test_mode === "1"} />
              </div>
            </ProviderCard>

            {/* Shopier */}
            <ProviderCard
              title="Shopier"
              description="Pratik Online Ödeme"
              icon={<ShoppingBag size={20} className="text-orange-400" />}
              accentClass="from-orange-500/10 to-transparent"
              iconBgClass="bg-orange-500/15"
              enabled={false}
              name="shopier_enabled"
            >
              <FieldRow label="API Key" name="shopier_api_key" defaultValue={settings.shopier_api_key} placeholder="shopier_api_key" />
              <FieldRow label="API Secret" name="shopier_api_secret" defaultValue={settings.shopier_api_secret} placeholder="shopier_api_secret" type="password" />
            </ProviderCard>

            {/* iyzico */}
            <ProviderCard
              title="iyzico"
              description="Kart · Cüzdan · BKM Express"
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-violet-400">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor"/>
                </svg>
              }
              accentClass="from-violet-500/10 to-transparent"
              iconBgClass="bg-violet-500/15"
              enabled={false}
              name="iyzico_enabled"
              badge="Yeni"
            >
              <FieldRow label="API Key" name="iyzico_api_key" defaultValue={settings.iyzico_api_key} placeholder="sandbox-..." />
              <FieldRow label="Secret Key" name="iyzico_secret_key" defaultValue={settings.iyzico_secret_key} placeholder="sandbox-..." type="password" />
              <FieldRow
                label="Base URL"
                name="iyzico_base_url"
                defaultValue={settings.iyzico_base_url || "https://api.iyzipay.com"}
                placeholder="https://api.iyzipay.com"
                hint="Sandbox: https://sandbox-api.iyzipay.com"
              />
            </ProviderCard>

            {/* Cryptomus */}
            <ProviderCard
              title="Cryptomus"
              description="Kripto Para (USDT, BTC, ETH, vb.)"
              icon={<Coins size={20} className="text-amber-400" />}
              accentClass="from-amber-500/10 to-transparent"
              iconBgClass="bg-amber-500/15"
              enabled={settings.cryptomus_enabled === "1"}
              name="cryptomus_enabled"
              badge="Kripto"
            >
              <FieldRow
                label="Tüccar Kimliği (Merchant ID)"
                name="cryptomus_merchant_id"
                defaultValue={settings.cryptomus_merchant_id}
                placeholder="860166ce-478c-4087-9813-55cfb6c34580"
                hint="Cryptomus paneli → API → Tüccar Kimliği (UUID formatında)"
              />
              <FieldRow
                label="Ödeme API Anahtarı (Payment API Key)"
                name="cryptomus_api_key"
                defaultValue={settings.cryptomus_api_key}
                placeholder="XzLe5YnNbFEa1YzaYQkSkmMZa1jviF7o..."
                type="password"
                hint="Cryptomus paneli → API → Ödemeler için API anahtarı. Bu anahtar hem fatura oluşturma hem de webhook imza doğrulama için kullanılır."
              />
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 mt-2">
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  <strong>Bilgi:</strong> Cryptomus API istekleri ve webhook imza doğrulaması için tek bir “Ödeme API Anahtarı” kullanılır. Merchant ID ve API Key boşluk içermemelidir; kayıt sırasında otomatik trim uygulanır.
                </p>
              </div>
            </ProviderCard>

            {/* Polar.sh */}
            <ProviderCard
              title="Polar.sh"
              description="Global Kredi Kartı · Apple Pay · Kripto"
              icon={<CreditCard size={20} className="text-sky-400" />}
              accentClass="from-sky-500/10 to-transparent"
              iconBgClass="bg-sky-500/15"
              enabled={false}
              name="polar_enabled"
              badge="Global"
            >
              <FieldRow
                label="API Erişim Belirteci (Access Token)"
                name="polar_api_key"
                defaultValue={settings.polar_api_key}
                placeholder="polar_oat_..."
                type="password"
                hint="Polar paneli → Settings → Access Tokens (Organization Access Token veya Personal Access Token)"
              />
              <FieldRow
                label="Ürün Kimliği (Product ID)"
                name="polar_product_id"
                defaultValue={settings.polar_product_id}
                placeholder="f0c65608-b7a7-4a74-91e6-921b8ba1caa7"
                hint="Polar paneli → Products → Ödeme için kullanılacak ürünün ID'si"
              />
              <FieldRow
                label="Webhook Gizli Anahtarı (Webhook Secret)"
                name="polar_webhook_secret"
                defaultValue={settings.polar_webhook_secret}
                placeholder="whsec_..."
                type="password"
                hint="Polar paneli → Settings → Webhooks → Oluşturduğunuz webhook'un gizli anahtarı"
              />
            </ProviderCard>

          </div>
        </div>

      </form>
    </div>
  );
}
