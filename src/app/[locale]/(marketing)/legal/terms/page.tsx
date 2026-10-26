import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "OptiSMM platformunun kullanım koşulları ve hizmet şartları.",

  alternates: {
    canonical: "/legal/terms",
    languages: hreflangAlternates("/legal/terms"),
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1>Kullanım Koşulları</h1>
        <p className="text-muted-foreground text-sm">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <h2>1. Hizmet Tanımı</h2>
        <p>
          OptiSMM (&quot;Platform&quot;), sosyal medya yönetim hizmetleri sunan bir çevrimiçi paneldir. Platform üzerinden
          sunulan tüm hizmetler, bu kullanım koşullarına tabidir.
        </p>

        <h2>2. Üyelik ve Hesap</h2>
        <p>
          Platforma kayıt olurken doğru ve güncel bilgiler sağlamayı kabul edersiniz. Hesap güvenliğiniz sizin
          sorumluluğunuzdadır. Hesabınızda gerçekleşen tüm işlemlerden siz sorumlusunuz.
        </p>

        <h2>3. Hizmet Kullanımı</h2>
        <ul>
          <li>Platformu yalnızca yasal amaçlarla kullanabilirsiniz.</li>
          <li>Spam, dolandırıcılık veya kötüye kullanım amaçlı işlemler yasaktır.</li>
          <li>Hizmetleri üçüncü kişilere izinsiz olarak yeniden satamazsınız.</li>
          <li>Platform API&apos;sini kötüye kullanan hesaplar askıya alınabilir.</li>
        </ul>

        <h2>4. Ödeme ve Bakiye</h2>
        <p>
          Bakiye yüklemeleri yapılan ödeme yöntemine göre işlenir. Yüklenen bakiye, platform içi hizmet satın alımlarında
          kullanılır. Bakiye iadesi için iade politikamıza bakınız.
        </p>

        <h2>5. Hizmet Garantisi</h2>
        <p>
          Siparişler genellikle belirtilen süre içinde tamamlanır. Ancak sosyal medya platformlarındaki değişiklikler
          nedeniyle gecikmeler yaşanabilir. Tamamlanamayan siparişler için bakiye iadesi yapılır.
        </p>

        <h2>6. Hesap Askıya Alma ve Fesih</h2>
        <p>
          Kullanım koşullarını ihlal eden hesaplar önceden bildirim yapılmaksızın askıya alınabilir veya
          kapatılabilir. Bu durumda bakiye iadesi platform yönetiminin takdirindedir.
        </p>

        <h2>7. Sorumluluk Sınırlaması</h2>
        <p>
          Platform, sosyal medya platformlarının politika değişikliklerinden kaynaklanan hizmet aksaklıklarından
          sorumlu tutulamaz. Hizmetler &quot;olduğu gibi&quot; sunulmaktadır.
        </p>

        <h2>8. Değişiklikler</h2>
        <p>
          Bu koşullar önceden bildirim yapılarak güncellenebilir. Güncellenmiş koşullar platformda yayınlandığı
          tarihte yürürlüğe girer. Platformu kullanmaya devam etmeniz, güncellenmiş koşulları kabul ettiğiniz anlamına gelir.
        </p>

        <h2>9. Uygulanacak Hukuk</h2>
        <p>
          Bu kullanım koşulları Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri ve
          İcra Daireleri yetkilidir.
        </p>
      </div>
    </div>
  );
}
