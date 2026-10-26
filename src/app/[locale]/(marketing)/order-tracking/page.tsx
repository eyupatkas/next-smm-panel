import { Suspense } from "react";
import { Package, Search } from "lucide-react";
import OrderTrackingClient from "@/components/marketing/OrderTrackingClient";
import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sipariş Takip",
  description: "Sipariş numaranızla siparişinizin güncel durumunu sorgulayın.",

  alternates: {
    canonical: "/order-tracking",
    languages: hreflangAlternates("/order-tracking"),
  },
};

export default function OrderTrackingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pt-28 pb-16 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Başlık */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Search size={24} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Sipariş Takip</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sipariş numaranızı girerek siparişinizin güncel durumunu öğrenin.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Package size={18} className="animate-pulse" />
              <span className="text-sm">Yükleniyor...</span>
            </div>
          }
        >
          <OrderTrackingClient />
        </Suspense>
      </div>
    </main>
  );
}
