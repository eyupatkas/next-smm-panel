# Next SMM Panel (OptiSMM)

Next.js, React, TypeScript ve PostgreSQL ile geliştirilmiş çok dilli bir SMM paneli. Proje geliştirmesi durdurulmuş, kaynak kodu topluluğun incelemesi, değiştirmesi ve kendi kurulumlarında kullanması için MIT lisansıyla yayımlanmıştır. Aktif bakım veya çalışan bir demo hizmeti sunulmamaktadır.

**English:** Discontinued, self-hosted SMM panel built with Next.js, React, Prisma and PostgreSQL. Released under MIT for learning, modification and reuse. No hosted service or active maintenance is provided. Bring your own database, provider accounts and payment credentials.

## Özellikler

- Kullanıcı, bayi ve yönetici panelleri; Google ve e-posta/parola ile giriş.
- Sağlayıcı entegrasyonları, servis kataloğu, paketler, toplu ve zamanlanmış siparişler.
- Bakiye, ödeme, destek talebi, referans ve büyüme görevleri akışları.
- PayTR, iyzico, Cryptomus, Shopier ve Polar entegrasyon kodları.
- Çok dil desteği, blog, SEO sayfaları ve sosyal medya araçları.
- Yapay zekâ destekli sipariş, içerik ve arka plan görevleri.

Entegrasyonlar için kendi hesaplarınızı ve anahtarlarınızı yapılandırmanız gerekir. Bu depo canlı veritabanı, müşteri/sipariş verileri, API anahtarları, sunucu logları veya yedekler içermez. Önceki kuruluma özel tek seferlik onarım ve müşteri işlem betikleri de paylaşılmamıştır.

## Gereksinimler

- Node.js 22 veya üzeri.
- pnpm 10.
- PostgreSQL ve yalnızca bu kurulum için oluşturulmuş bir veritabanı.

Sürümler `package.json` ve `pnpm-lock.yaml` içinde tutulur. Proje Next.js App Router ve Prisma 7 kullanır.

## Yerel kurulum

```bash
git clone https://github.com/eyupatkas/next-smm-panel.git
cd next-smm-panel
cp .env.example .env
pnpm install --frozen-lockfile
```

`.env` içindeki `DATABASE_URL` değerini kendi PostgreSQL bağlantınızla değiştirin. `AUTH_SECRET` ve `CRON_SECRET` için ayrı ayrı `openssl rand -hex 32` çalıştırarak değer üretin. Örnek dosyadaki boş anahtarları gerektiğinde doldurun.

Boş veritabanında şemayı oluşturun ve geliştirme sunucusunu başlatın:

```bash
pnpm exec prisma db push
pnpm dev
```

Uygulama `http://localhost:3000` üzerinde açılır. Depoda eski kurulumun migration geçmişi bulunmadığından ilk kurulum mevcut Prisma şemasıyla yapılır.

### Yönetici hesabı

`.env` dosyasında `ADMIN_EMAIL` ve en az 12 karakterlik benzersiz `ADMIN_PASSWORD` belirleyin:

```bash
pnpm admin:reset
```

Bu komut belirtilen e-postayı yönetici yapar veya hesabı oluşturur; parola loglanmaz. Sağlayıcı ve ödeme ayarlarını yönetici panelinden yapılandırın.

İsteğe bağlı demo verileri yalnızca yerel geliştirme içindir:

```bash
pnpm exec prisma db seed
```

Seed betiği bilinen demo parolalarıyla yönetici, kullanıcı ve bayi hesapları oluşturur; `NODE_ENV=production` ortamında çalışmayı reddeder. Gerçek kurulumlarda demo hesabı oluşturmayın.

## Kontroller ve üretim

```bash
pnpm test
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm start
```

`pnpm build` sırasında yapılandırılmış veritabanına erişim gerekir. Üretimde genel URL değişkenlerini kendi HTTPS alan adınızla ayarlayın. PM2 kullanacaksanız depodaki `ecosystem.config.js` örneği 3030 portunda çalışır; URL ve ters proxy ayarlarınızı buna göre düzenleyin.

Arka plan görevleri `.env.example` içinde kapalıdır. Kendi entegrasyonlarınızı doğruladıktan sonra `DISABLE_EMBEDDED_SCHEDULER=0` ile açabilirsiniz. `scripts/agent-scheduler.js` ayrı zamanlayıcı örneğidir; aynı işleri iki kez çalıştırmamak için gömülü zamanlayıcı ile birlikte başlatmayın.

Eski OptiSMM/TakipUP marka metinleri, alan adı varsayılanları ve iletişim bilgileri kodda bulunabilir. Kendi kurulumunuzda bunları değiştirin; eski alan adlarını hizmet veya destek adresi olarak kullanmayın. Google Ads ayarlarını kaydeden kodun `/root/google-ads.yaml` dosyasına yazdığını da kendi ortamınıza göre uyarlayın.

## Yayım sırasında doğrulama

- Gizli bilgi taraması: Gitleaks bulgu bildirmedi; üretim anahtarlarının kaynakta bulunmadığı ayrıca kontrol edildi.
- Testler: 45 testten 44’ü geçti. `src/lib/pricing.test.ts` içindeki indirimsiz fiyatlandırma beklentisi 20 iken mevcut uygulama 24 döndürüyor; bu bilinen tutarsızlık korunmuştur.
- ESLint: 0 hata, 117 uyarı.
- Next.js rota tipleri oluşturulduktan sonra TypeScript kontrolü başarılı.
- Üretim derlemesi ve gerçek ödeme/sağlayıcı işlemleri bu yayım için doğrulanmadı.

## Yararlı betikler

- `pnpm packages:retail`: katalogdan perakende paketler oluşturur/günceller.
- `pnpm pricing:optimize`: fiyatlandırmayı inceler; `--apply` ile değişiklik uygular. Yedekleri varsayılan olarak `backups/pricing` altında tutar; `PRICING_BACKUP_DIRECTORY` ile değiştirebilirsiniz.

## Lisans

Proje kodu [MIT](LICENSE) lisanslıdır. Üçüncü taraf paketler ve marka/logolar kendi hak sahiplerine ve lisanslarına tabidir.
