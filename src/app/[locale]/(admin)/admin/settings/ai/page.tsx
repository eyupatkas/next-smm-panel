import { getAiProviders } from "@/lib/actions/ai-actions";
import { AiSettingsClient } from "@/components/admin/AiSettingsClient";

export default async function AiSettingsPage() {
  const providers = await getAiProviders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Yapay Zeka Ayarları</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gemini ve DeepSeek sağlayıcılarını yapılandırın, API anahtarları ve model seçimi yapın.
        </p>
      </div>
      <AiSettingsClient providers={providers} />
    </div>
  );
}
