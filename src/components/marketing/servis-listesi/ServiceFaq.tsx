import { ChevronDown } from "lucide-react";
import { FaqJsonLd } from "./JsonLd";

export type Faq = { q: string; a: string };

export function ServiceFaq({
  title,
  faqs,
  emitJsonLd = true,
}: {
  title?: string;
  faqs: Faq[];
  emitJsonLd?: boolean;
}) {
  if (faqs.length === 0) return null;
  return (
    <section
      aria-label={title ?? "Sıkça Sorulan Sorular"}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
    >
      <h2 className="mb-5 text-xl font-bold text-foreground">
        {title ?? "Sıkça Sorulan Sorular"}
      </h2>
      <div className="divide-y divide-border/60">
        {faqs.map((faq, i) => (
          <details
            key={i}
            className="group py-3 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
              <span>{faq.q}</span>
              <ChevronDown
                size={16}
                className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
      {emitJsonLd && <FaqJsonLd faqs={faqs} />}
    </section>
  );
}

// ── Default FAQ generators ──────────────────────────────────────────────────

export function buildServiceFaqs({
  serviceName,
  platform,
  min,
  max,
  canRefill,
  canCancel,
}: {
  serviceName: string;
  platform: string;
  min: number;
  max: number;
  canRefill: boolean;
  canCancel: boolean;
}): Faq[] {
  return [
    {
      q: `${serviceName} ne kadar sürede teslim edilir?`,
      a: `${serviceName} hizmetimiz sipariş onaylandıktan sonra otomatik olarak işleme alınır. Teslimat hızı, talep yoğunluğuna ve ${platform} platformunun durumuna göre dakikalar içinde başlar ve birkaç saat içinde tamamlanır.`,
    },
    {
      q: `Minimum ve maksimum sipariş miktarı nedir?`,
      a: `Bu hizmet için minimum ${min.toLocaleString("tr-TR")}, maksimum ${max.toLocaleString("tr-TR")} adet sipariş verebilirsiniz. Belirtilen aralık dışında sipariş kabul edilmemektedir.`,
    },
    {
      q: `Hesabımın güvenliği için risk var mı?`,
      a: `Hayır. Hizmetlerimiz tamamen şifre talep etmeden, yalnızca herkese açık ${platform} profil veya gönderi linki üzerinden çalışır. Hesap güvenliğiniz ön plandadır.`,
    },
    {
      q: `Düşme veya iade garantisi var mı?`,
      a: canRefill
        ? "Evet. Bu hizmette teslimat sonrası belirli bir süre içinde yaşanan düşüşlerde otomatik telafi talebi oluşturabilirsiniz."
        : "Bu hizmette otomatik telafi bulunmuyor. Düşüş durumunda destek ekibimize ulaşarak inceleme talep edebilirsiniz.",
    },
    {
      q: `Siparişi iptal edebilir miyim?`,
      a: canCancel
        ? "Sipariş başlatıldıktan sonra teslimat aşamasına geçmemişse iptal edebilirsiniz. İptal edilen siparişlerde tutar bakiyenize iade edilir."
        : "Bu hizmette teslimat başladıktan sonra iptal mümkün değildir. Lütfen sipariş öncesi link ve miktar bilgilerini kontrol edin.",
    },
    {
      q: `Ödeme nasıl yapılır?`,
      a: "Kayıt olduktan sonra panelinize bakiye yükleyerek istediğiniz hizmeti tek tıkla satın alabilirsiniz. Kredi kartı, havale ve diğer ödeme yöntemleri desteklenmektedir.",
    },
  ];
}

export function buildCategoryFaqs(category: string, count: number): Faq[] {
  return [
    {
      q: `${category} hizmetlerinden hangilerini almalıyım?`,
      a: `${category} kategorisinde toplam ${count.toLocaleString("tr-TR")} farklı hizmet bulunmaktadır. Bütçenize, hedefinize ve hızınıza göre uygun olanı seçebilirsiniz. Detay sayfasında her hizmetin özelliklerini karşılaştırabilirsiniz.`,
    },
    {
      q: `Fiyatlar neden değişiyor?`,
      a: "Fiyatlar sağlayıcı maliyetleri, kalite ve teslimat hızı parametrelerine göre belirlenir. Hızlı ve kaliteli hizmetler genellikle biraz daha yüksek fiyatlıdır.",
    },
    {
      q: `Hesap güvenliği için bilgi paylaşmam gerekiyor mu?`,
      a: "Hayır. Yalnızca herkese açık profil ya da gönderi bağlantınızı paylaşmanız yeterlidir. Hiçbir koşulda parola, e-posta doğrulama kodu ya da iki adımlı doğrulama bilgisi istenmez.",
    },
    {
      q: `Ortalama teslimat süresi nedir?`,
      a: `${category} hizmetlerinde sipariş onaylandıktan sonra otomatik olarak işleme alınır ve genelde dakikalar içinde teslimat başlar.`,
    },
  ];
}
