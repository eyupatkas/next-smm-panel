import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",

  alternates: {
    canonical: "/legal/kvkk",
    languages: hreflangAlternates("/legal/kvkk"),
  },
};

export default function KvkkPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1>KVKK Aydınlatma Metni</h1>
        <p className="text-muted-foreground text-sm">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, OptiSMM olarak veri sorumlusu
          sıfatıyla kişisel verilerinizi aşağıda açıklanan çerçevede işlemekteyiz.
        </p>

        <h2>1. Veri Sorumlusu</h2>
        <p>
          OptiSMM platformu, kişisel verilerinizin işlenmesinde veri sorumlusu sıfatıyla hareket etmektedir.
        </p>

        <h2>2. İşlenen Kişisel Veriler</h2>
        <table>
          <thead>
            <tr>
              <th>Veri Kategorisi</th>
              <th>Veriler</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Kimlik Bilgileri</td>
              <td>Ad, soyad, kullanıcı adı</td>
            </tr>
            <tr>
              <td>İletişim Bilgileri</td>
              <td>E-posta, telefon numarası</td>
            </tr>
            <tr>
              <td>Hesap Bilgileri</td>
              <td>Şifre (hashlenmiş), API anahtarı</td>
            </tr>
            <tr>
              <td>İşlem Bilgileri</td>
              <td>Sipariş geçmişi, bakiye hareketleri, ödeme kayıtları</td>
            </tr>
            <tr>
              <td>Teknik Veriler</td>
              <td>IP adresi, çerez verileri, oturum bilgileri</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
        <ul>
          <li>Üyelik işlemlerinin gerçekleştirilmesi</li>
          <li>Hizmet sunumu ve sipariş yönetimi</li>
          <li>Ödeme işlemlerinin yürütülmesi</li>
          <li>Müşteri memnuniyeti ve destek hizmetleri</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li>Bilgi güvenliği süreçlerinin yürütülmesi</li>
        </ul>

        <h2>4. Hukuki Sebepler</h2>
        <p>Kişisel verileriniz KVKK&apos;nın 5. maddesinde belirtilen aşağıdaki hukuki sebepler kapsamında işlenmektedir:</p>
        <ul>
          <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması</li>
          <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi</li>
          <li>Veri sorumlusunun meşru menfaatleri için zorunlu olması</li>
          <li>Açık rızanızın bulunması</li>
        </ul>

        <h2>5. Verilerin Aktarılması</h2>
        <p>
          Kişisel verileriniz; yasal zorunluluklar, hizmet sunumu ve ödeme işlemleri kapsamında yurt içi ve
          yurt dışındaki hizmet sağlayıcılarla KVKK&apos;nın 8. ve 9. maddelerine uygun olarak aktarılabilir.
        </p>

        <h2>6. Veri Saklama Süresi</h2>
        <p>
          Kişisel verileriniz, işlenme amacının gerektirdiği süre boyunca ve yasal saklama süreleri dahilinde
          muhafaza edilir. Süre sona erdiğinde veriler silinir, yok edilir veya anonim hale getirilir.
        </p>

        <h2>7. Veri Sahibi Hakları</h2>
        <p>KVKK&apos;nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmesi halinde düzeltilmesini isteme</li>
          <li>KVKK&apos;nın 7. maddesinde öngörülen şartlar çerçevesinde silinmesini/yok edilmesini isteme</li>
          <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
          <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
        </ul>

        <h2>8. Başvuru Yöntemi</h2>
        <p>
          Yukarıda belirtilen haklarınızı kullanmak için destek kanallarımız veya e-posta adresimiz üzerinden
          yazılı olarak başvurabilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak yanıtlanır.
        </p>
      </div>
    </div>
  );
}
