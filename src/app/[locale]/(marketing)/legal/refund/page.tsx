import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "İade Politikası",
  description: "OptiSMM platformunun iade ve cayma hakkı koşulları.",

  alternates: {
    canonical: "/legal/refund",
    languages: hreflangAlternates("/legal/refund"),
  },
};

export default function RefundPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1>İade Politikası</h1>
        <p className="text-muted-foreground text-sm">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <h2>1. Genel İade Koşulları</h2>
        <p>
          OptiSMM platformunda verilen siparişler, hizmetin doğası gereği dijital olarak gerçekleştirilmektedir.
          Aşağıdaki durumlarda iade işlemi uygulanır:
        </p>

        <h2>2. Bakiye İadesi Yapılan Durumlar</h2>
        <ul>
          <li><strong>Tamamlanamayan siparişler:</strong> Sistem tarafından tamamlanamayan siparişlerin bedeli otomatik olarak bakiyenize iade edilir.</li>
          <li><strong>Kısmi teslim:</strong> Sipariş edilen miktarın tamamı teslim edilemezse, eksik kalan kısım için bakiye iadesi yapılır.</li>
          <li><strong>Teknik arıza:</strong> Platform kaynaklı teknik bir sorun nedeniyle hizmet sağlanamaması halinde tam bakiye iadesi yapılır.</li>
        </ul>

        <h2>3. İade Yapılmayan Durumlar</h2>
        <ul>
          <li>Sipariş işleme alındıktan ve teslim edildikten sonra sosyal medya platformunun kendi kararıyla yapılan düşüşler</li>
          <li>Kullanıcı hatasından kaynaklanan yanlış link veya sipariş bilgisi girişi</li>
          <li>Kullanım koşullarına aykırı kullanım nedeniyle askıya alınan hesaplardaki bakiyeler</li>
          <li>Üçüncü taraf sosyal medya platformlarının politika değişikliğinden kaynaklanan durumlar</li>
        </ul>

        <h2>4. İade Süreci</h2>
        <ol>
          <li>Sipariş numaranızla birlikte destek talebi oluşturun</li>
          <li>Ekibimiz talebi inceleyip en geç 48 saat içinde yanıt verir</li>
          <li>Onaylanan iadeler bakiyenize yansıtılır</li>
        </ol>

        <h2>5. Nakit İade</h2>
        <p>
          Platform içi bakiye iadesi dışında nakit iade talepleri, yalnızca bakiye hiç kullanılmamışsa ve
          yükleme tarihinden itibaren 14 gün içinde yapılmışsa değerlendirmeye alınır. Ödeme yöntemi komisyonları
          düşülerek iade yapılır.
        </p>

        <h2>6. Otomatik İade Sistemi</h2>
        <p>
          Sağlayıcı sistemleri tarafından otomatik refund edilen siparişlerin bedeli, herhangi bir talep
          gerekmeksizin bakiyenize otomatik olarak iade edilir.
        </p>

        <h2>7. İletişim</h2>
        <p>
          İade talepleriniz ve sorularınız için platform içi destek sistemi veya e-posta kanalını kullanabilirsiniz.
        </p>
      </div>
    </div>
  );
}
