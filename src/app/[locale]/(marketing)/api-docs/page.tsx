import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "API Dokümantasyonu | OptiSMM SMM Panel API v2",
  description:
    "OptiSMM SMM panel API v2 dokümantasyonu. Sipariş oluşturma, durum sorgulama, bakiye takibi için REST API endpointleri.",
  keywords: ["smm panel api", "smm api dokümantasyonu", "optismm api", "smm panel rest api"],
  alternates: {
    canonical: "/api-docs",
    languages: hreflangAlternates("/api-docs"),
  },
  openGraph: {
    type: "website",
    siteName: "OptiSMM",
    title: "API Dokümantasyonu | OptiSMM SMM Panel",
    description: "OptiSMM SMM panel API v2 dokümantasyonu.",
  },
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-black/30 p-4 text-xs text-foreground whitespace-pre-wrap break-all">
      <code>{children}</code>
    </pre>
  );
}

function ParamRow({ name, desc, required }: { name: string; desc: string; required?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <code className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-xs text-sky-300 font-mono">{name}</code>
      {required && <Badge variant="secondary" className="shrink-0 text-[10px] h-4 border-amber-500/30 bg-amber-500/10 text-amber-400">zorunlu</Badge>}
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

export default async function ApiDocsPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { apiKey: true },
      })
    : null;

  const sampleKey = user?.apiKey || "YOUR_API_KEY";
  const baseUrl = "https://optismm.com/api/v2";

  return (
    <div className="min-h-screen px-4 pt-28 pb-16">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-3 mb-2">
            <Badge className="text-xs">v2</Badge>
            <h1 className="text-3xl font-bold tracking-tight">API Dokümantasyonu</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            SMM panel otomasyonu için: servis listesi, sipariş oluşturma, durum sorgulama, iptal ve bakiye işlemleri.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-muted-foreground mb-1">API URL</p>
            <code className="text-sm text-primary font-mono">{baseUrl}</code>
          </div>
        </div>

        {/* Reseller / API B2B Banner */}
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent p-6 shadow-lg overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
            <Sparkles size={120} className="text-violet-400" />
          </div>
          <div className="max-w-2xl space-y-3 relative z-10">
            <Badge className="bg-violet-500 text-white font-bold animate-pulse hover:bg-violet-600">B2B BAYİLİK FIRSATI</Badge>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">API Entegrasyonu ile Kendi Panelinizi Kurun ve Otomatik Kazanın!</h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              OptiSMM API'sini kendi SMM panelinize veya özel yazılımlarınıza entegre ederek, hiçbir siparişle manuel ilgilenmeden otomatik olarak satış yapmaya başlayın.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Badge variant="outline" className="border-violet-500/30 text-violet-300 bg-violet-500/5">Gelişmiş Fiyatlandırma</Badge>
                Bayilik başvurusu yaparak daha uygun/indirimli fiyatlarla hizmet alabilirsiniz.
              </p>
              <Link 
                href="/dashboard/reseller/apply" 
                className="inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-violet-900/20"
              >
                Bayilik Başvurusu Yap →
              </Link>
            </div>
          </div>
        </div>

        {/* Auth */}
        <Card className="border-white/10">
          <CardHeader><CardTitle>Kimlik Doğrulama</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Her istekte <code className="text-sky-300">key</code> parametresini POST body içinde gönderin.</p>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 font-mono text-xs text-foreground break-all">
              {sampleKey}
            </div>
            {!user?.apiKey && (
              <p className="text-xs text-amber-400">Giriş yaparak kendi API anahtarınızı görüntüleyin.</p>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Servis Listesi
              <Badge variant="secondary" className="text-xs">GET/POST</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <ParamRow name="key" desc="API anahtarınız" required />
              <ParamRow name="action" desc='Sabit: "services"' required />
            </div>
            <CodeBlock>{`curl -X POST ${baseUrl} \\
  -d "key=${sampleKey}&action=services"`}</CodeBlock>
            <p className="text-xs text-muted-foreground font-semibold">Örnek Yanıt:</p>
            <CodeBlock>{`[
  {
    "service": 1,
    "name": "Instagram Takipçi",
    "type": "Default",
    "category": "Instagram",
    "rate": "1.50",
    "min": 100,
    "max": 50000,
    "refill": true,
    "cancel": true,
    "dripfeed": false
  }
]`}</CodeBlock>
          </CardContent>
        </Card>

        {/* Add Order */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Sipariş Oluştur
              <Badge variant="secondary" className="text-xs">POST</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <ParamRow name="key" desc="API anahtarınız" required />
              <ParamRow name="action" desc='Sabit: "add"' required />
              <ParamRow name="service" desc="Servis ID (services listesinden)" required />
              <ParamRow name="link" desc="Hedef URL (Instagram profili, TikTok videosu vb.)" required />
              <ParamRow name="quantity" desc="Sipariş miktarı (min/max aralığında olmalı)" required />
              <ParamRow name="runs" desc="Kademeli teslimat kaç kez tekrarlanacak (dripfeed destekli servislerde)" />
              <ParamRow name="interval" desc="Kademeli teslimat aralığı (dakika cinsinden)" />
            </div>
            <CodeBlock>{`curl -X POST ${baseUrl} \\
  -d "key=${sampleKey}&action=add&service=1&link=https://instagram.com/example&quantity=1000"`}</CodeBlock>
            <p className="text-xs text-muted-foreground font-semibold">Başarılı Yanıt:</p>
            <CodeBlock>{`{ "order": 23501 }`}</CodeBlock>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Sipariş Durumu
              <Badge variant="secondary" className="text-xs">POST</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <ParamRow name="key" desc="API anahtarınız" required />
              <ParamRow name="action" desc='Sabit: "status"' required />
              <ParamRow name="order" desc="Sipariş ID (tek)" required />
            </div>
            <CodeBlock>{`curl -X POST ${baseUrl} \\
  -d "key=${sampleKey}&action=status&order=23501"`}</CodeBlock>
            <p className="text-xs text-muted-foreground font-semibold">Örnek Yanıt:</p>
            <CodeBlock>{`{
  "charge": "1.50",
  "start_count": "1200",
  "status": "In progress",
  "remains": "400",
  "currency": "TRY"
}`}</CodeBlock>
            <p className="text-xs text-muted-foreground">
              <strong>status</strong> değerleri: <code>Pending</code> · <code>In progress</code> · <code>Completed</code> · <code>Partial</code> · <code>Canceled</code>
            </p>
          </CardContent>
        </Card>

        {/* Multiple Order Status */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Çoklu Sipariş Durumu
              <Badge variant="secondary" className="text-xs">POST</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <ParamRow name="key" desc="API anahtarınız" required />
              <ParamRow name="action" desc='Sabit: "status"' required />
              <ParamRow name="orders" desc="Virgülle ayrılmış sipariş ID'leri (max 100)" required />
            </div>
            <CodeBlock>{`curl -X POST ${baseUrl} \\
  -d "key=${sampleKey}&action=status&orders=23501,23502,23503"`}</CodeBlock>
            <p className="text-xs text-muted-foreground font-semibold">Örnek Yanıt:</p>
            <CodeBlock>{`{
  "23501": { "charge": "1.50", "start_count": "1200", "status": "Completed", "remains": "0", "currency": "TRY" },
  "23502": { "charge": "0.75", "start_count": "500",  "status": "In progress", "remains": "200", "currency": "TRY" },
  "23503": { "error": "Incorrect order ID" }
}`}</CodeBlock>
          </CardContent>
        </Card>

        {/* Cancel Order */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Sipariş İptal
              <Badge variant="secondary" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">POST</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground text-xs">
              Sadece <code className="text-amber-300">cancel: true</code> olan servisler iptal edilebilir.
              Teslim edilmemiş miktar otomatik olarak bakiyeye iade edilir.
            </p>
            <div className="space-y-1">
              <ParamRow name="key" desc="API anahtarınız" required />
              <ParamRow name="action" desc='Sabit: "cancel"' required />
              <ParamRow name="orders" desc="Virgülle ayrılmış sipariş ID'leri (max 100)" required />
            </div>
            <CodeBlock>{`curl -X POST ${baseUrl} \\
  -d "key=${sampleKey}&action=cancel&orders=23501,23502"`}</CodeBlock>
            <p className="text-xs text-muted-foreground font-semibold">Örnek Yanıt:</p>
            <CodeBlock>{`[
  { "order": 23501, "cancel": 1 },
  { "order": 23502, "cancel": { "error": "Order cannot be cancelled" } }
]`}</CodeBlock>
          </CardContent>
        </Card>

        {/* Refill */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Refill (Yenileme)
              <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">POST</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground text-xs">
              Sadece <code className="text-emerald-300">refill: true</code> olan servisler için uygulanabilir.
              Düşenleri garanti kapsamında yerine koyar.
            </p>
            <div className="space-y-1">
              <ParamRow name="key" desc="API anahtarınız" required />
              <ParamRow name="action" desc='Sabit: "refill"' required />
              <ParamRow name="order" desc="Sipariş ID" required />
            </div>
            <CodeBlock>{`curl -X POST ${baseUrl} \\
  -d "key=${sampleKey}&action=refill&order=23501"`}</CodeBlock>
            <p className="text-xs text-muted-foreground font-semibold">Başarılı Yanıt:</p>
            <CodeBlock>{`{ "refill": "42" }`}</CodeBlock>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Bakiye Sorgula
              <Badge variant="secondary" className="text-xs">POST</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <ParamRow name="key" desc="API anahtarınız" required />
              <ParamRow name="action" desc='Sabit: "balance"' required />
            </div>
            <CodeBlock>{`curl -X POST ${baseUrl} \\
  -d "key=${sampleKey}&action=balance"`}</CodeBlock>
            <p className="text-xs text-muted-foreground font-semibold">Örnek Yanıt:</p>
            <CodeBlock>{`{
  "balance": "142.50",
  "currency": "TRY"
}`}</CodeBlock>
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card className="border-white/10">
          <CardHeader><CardTitle>Hata Kodları</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="space-y-1">
              <ParamRow name="error: Incorrect API key" desc="API anahtarı geçersiz veya eksik" />
              <ParamRow name="error: Incorrect order ID" desc="Sipariş ID bulunamadı" />
              <ParamRow name="error: Not enough funds" desc="Yetersiz bakiye" />
              <ParamRow name="error: Invalid quantity" desc="Miktar min/max aralığı dışında" />
              <ParamRow name="error: Service not found" desc="Servis ID geçersiz veya pasif" />
              <ParamRow name="error: Order cannot be cancelled" desc="Servis iptali desteklemiyor veya zaten tamamlandı" />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

