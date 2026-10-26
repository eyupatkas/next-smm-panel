import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "OptiSMM platformunun çerez (cookie) kullanım politikası.",

  alternates: {
    canonical: "/legal/cookies",
    languages: hreflangAlternates("/legal/cookies"),
  },
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1>Çerez Politikası</h1>
        <p className="text-muted-foreground text-sm">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <h2>1. Çerez Nedir?</h2>
        <p>
          Çerezler (cookies), web siteleri tarafından tarayıcınıza gönderilen ve cihazınızda saklanan küçük
          metin dosyalarıdır. Web sitesinin düzgün çalışması, güvenlik sağlanması ve kullanıcı deneyiminin
          iyileştirilmesi amacıyla kullanılır.
        </p>

        <h2>2. Kullandığımız Çerez Türleri</h2>

        <h3>Zorunlu Çerezler</h3>
        <p>
          Platformun temel işlevlerinin çalışması için gerekli çerezlerdir. Oturum yönetimi, güvenlik
          doğrulaması ve form gönderimlerinde kullanılır.
        </p>
        <ul>
          <li><code>authjs.session-token</code> — Oturum kimlik doğrulama çerezi</li>
          <li><code>authjs.csrf-token</code> — CSRF koruma çerezi</li>
          <li><code>authjs.callback-url</code> — Yönlendirme URL çerezi</li>
        </ul>

        <h3>İşlevsel Çerezler</h3>
        <p>
          Kullanıcı tercihlerini (tema, dil, son görüntülenen sayfa vb.) hatırlamak için kullanılır.
        </p>

        <h3>Analitik Çerezler</h3>
        <p>
          Platform kullanım istatistiklerini toplamak ve hizmet kalitesini artırmak amacıyla kullanılabilir.
          Bu çerezler anonim veri toplar ve kişisel olarak sizi tanımlamaz.
        </p>

        <h2>3. Çerezleri Yönetme</h2>
        <p>
          Tarayıcı ayarlarınızdan çerezleri kontrol edebilirsiniz. Çerezleri engellemek platformun bazı
          özelliklerinin düzgün çalışmamasına neden olabilir.
        </p>
        <ul>
          <li><strong>Chrome:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler</li>
          <li><strong>Firefox:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler ve Site Verileri</li>
          <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezleri Yönet</li>
          <li><strong>Edge:</strong> Ayarlar → Çerezler ve Site İzinleri</li>
        </ul>

        <h2>4. Üçüncü Taraf Çerezleri</h2>
        <p>
          Platformumuz, ödeme işlemleri ve analitik hizmetleri için üçüncü taraf çerezleri kullanabilir.
          Bu çerezler ilgili üçüncü tarafların gizlilik politikalarına tabidir.
        </p>

        <h2>5. Değişiklikler</h2>
        <p>
          Bu çerez politikası gerektiğinde güncellenebilir. Güncellemeler bu sayfada yayınlanır.
        </p>
      </div>
    </div>
  );
}
