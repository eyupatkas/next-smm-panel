import type { Metadata } from "next";
import Link from "next/link";
import { hreflangAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "OptiSMM platformunun gizlilik politikası ve kişisel verilerin korunması hakkında bilgilendirme.",

  alternates: {
    canonical: "/legal/privacy",
    languages: hreflangAlternates("/legal/privacy"),
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1>Gizlilik Politikası</h1>
        <p className="text-muted-foreground text-sm">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <h2>1. Toplanan Veriler</h2>
        <p>Platformumuzu kullanırken aşağıdaki veriler toplanabilir:</p>
        <ul>
          <li><strong>Kimlik bilgileri:</strong> Ad, soyad, kullanıcı adı, e-posta adresi, telefon numarası</li>
          <li><strong>Hesap bilgileri:</strong> Şifre (şifrelenmiş), API anahtarı, bakiye bilgileri</li>
          <li><strong>İşlem bilgileri:</strong> Sipariş geçmişi, ödeme kayıtları</li>
          <li><strong>Teknik bilgiler:</strong> IP adresi, tarayıcı bilgisi, çerezler</li>
        </ul>

        <h2>2. Verilerin Kullanım Amacı</h2>
        <p>Toplanan veriler aşağıdaki amaçlarla kullanılır:</p>
        <ul>
          <li>Hizmetlerin sunulması ve sipariş işlenmesi</li>
          <li>Hesap güvenliğinin sağlanması</li>
          <li>Müşteri desteği sağlanması</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li>Hizmet kalitesinin iyileştirilmesi</li>
        </ul>

        <h2>3. Verilerin Paylaşımı</h2>
        <p>
          Kişisel verileriniz üçüncü taraflarla yalnızca aşağıdaki durumlarda paylaşılır:
        </p>
        <ul>
          <li>Yasal zorunluluk halinde (mahkeme kararı, resmi talep)</li>
          <li>Ödeme işlemleri için ödeme sağlayıcılarıyla</li>
          <li>Hizmet sunumu için teknik altyapı sağlayıcılarıyla</li>
        </ul>

        <h2>4. Veri Güvenliği</h2>
        <p>
          Kişisel verileriniz endüstri standardı güvenlik önlemleriyle korunmaktadır. Şifreler bcrypt algoritmasıyla
          hashlenir, iletişim SSL/TLS ile şifrelenir ve veriler güvenli sunucularda saklanır.
        </p>

        <h2>5. Çerezler</h2>
        <p>
          Platformumuz oturum yönetimi ve kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır.
          Detaylı bilgi için <Link href="/legal/cookies" className="text-primary">Çerez Politikası</Link> sayfamızı ziyaret edin.
        </p>

        <h2>6. Kullanıcı Hakları</h2>
        <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenme amacını ve uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme</li>
          <li>Silinmesini veya yok edilmesini isteme</li>
        </ul>

        <h2>7. İletişim</h2>
        <p>
          Gizlilik politikası ile ilgili sorularınız için destek kanallarımız üzerinden bizimle iletişime geçebilirsiniz.
        </p>
      </div>
    </div>
  );
}
