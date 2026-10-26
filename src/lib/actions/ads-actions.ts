"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setSettings } from "@/lib/settings";
import type { Session } from "next-auth";
import fs from "fs/promises";

function ensureAdmin(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export async function saveAdsSettings(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const googleAdsEnabled = formData.get("google_ads_enabled") === "on" ? "1" : "0";
  const googleAdsDeveloperToken = String(formData.get("google_ads_developer_token") || "").trim();
  const googleAdsClientId = String(formData.get("google_ads_client_id") || "").trim();
  const googleAdsClientSecret = String(formData.get("google_ads_client_secret") || "").trim();
  const googleAdsRefreshToken = String(formData.get("google_ads_refresh_token") || "").trim();
  const googleAdsLoginCustomerId = String(formData.get("google_ads_login_customer_id") || "").trim();

  const metaAdsEnabled = formData.get("meta_ads_enabled") === "on" ? "1" : "0";
  const metaAdsPixelId = String(formData.get("meta_ads_pixel_id") || "").trim();
  const metaAdsAccessToken = String(formData.get("meta_ads_access_token") || "").trim();

  // 1. Veritabanına ayarları kaydet
  await setSettings({
    google_ads_enabled: googleAdsEnabled,
    google_ads_developer_token: googleAdsDeveloperToken,
    google_ads_client_id: googleAdsClientId,
    google_ads_client_secret: googleAdsClientSecret,
    google_ads_refresh_token: googleAdsRefreshToken,
    google_ads_login_customer_id: googleAdsLoginCustomerId,

    meta_ads_enabled: metaAdsEnabled,
    meta_ads_pixel_id: metaAdsPixelId,
    meta_ads_access_token: metaAdsAccessToken,
  });

  // 2. /root/google-ads.yaml dosyasını otomatik olarak güncelle
  try {
    const yamlContent = `# Google Ads API Kimlik Bilgileri Yapılandırma Dosyası
# Admin paneli üzerinden otomatik olarak oluşturulmuştur.

developer_token: "${googleAdsDeveloperToken}"
client_id: "${googleAdsClientId}"
client_secret: "${googleAdsClientSecret}"
refresh_token: "${googleAdsRefreshToken}"
login_customer_id: "${googleAdsLoginCustomerId}"
`;
    await fs.writeFile("/root/google-ads.yaml", yamlContent, "utf-8");
  } catch (error) {
    console.error("[ads-actions] Failed to write /root/google-ads.yaml:", error);
  }

  revalidatePath("/admin/settings/ads");
}
