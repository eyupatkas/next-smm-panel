import type { Metadata } from "next";
import { AIChatOrder } from "@/components/shared/AIChatOrder";

export const metadata: Metadata = {
  title: "Yapay Zeka Hızlı Sipariş",
  description: "Sosyal medya siparişlerinizi sadece yazışarak oluşturun.",
};

export default function Page() {
  return (
    <div className="w-full space-y-6 py-6">
      <div className="space-y-2 text-left">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Yapay Zeka Sipariş</h2>
        <p className="text-sm text-slate-400">
          Aşağıdaki sohbet penceresini kullanarak istediğiniz sosyal medya hizmetini tarif edin ve anında sipariş verin.
        </p>
      </div>
      <AIChatOrder />
    </div>
  );
}
