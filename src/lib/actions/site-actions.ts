"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setSettings } from "@/lib/settings";
import type { Session } from "next-auth";
import { exec } from "child_process";

function ensureAdmin(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export async function saveSiteSettings(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const values = {
    site_name: String(formData.get("site_name") || "").trim(),
    site_description: String(formData.get("site_description") || "").trim(),
    site_keywords: String(formData.get("site_keywords") || "").trim(),
    site_logo_url: String(formData.get("site_logo_url") || "").trim(),
    site_favicon_url: String(formData.get("site_favicon_url") || "").trim(),
    site_contact_email: String(formData.get("site_contact_email") || "").trim(),
    site_contact_phone: String(formData.get("site_contact_phone") || "").trim(),
    site_social_instagram: String(formData.get("site_social_instagram") || "").trim(),
    site_social_twitter: String(formData.get("site_social_twitter") || "").trim(),
    site_social_telegram: String(formData.get("site_social_telegram") || "").trim(),
    site_announcement: String(formData.get("site_announcement") || "").trim(),
    site_announcement_enabled: formData.get("site_announcement_enabled") === "on" ? "1" : "0",
    whatsapp_button_enabled: formData.get("whatsapp_button_enabled") === "on" ? "1" : "0",
    default_locale: String(formData.get("default_locale") || "tr").trim(),
    default_currency: String(formData.get("default_currency") || "TRY").trim(),
    multi_language_enabled: formData.get("multi_language_enabled") === "on" ? "1" : "0",
    multi_currency_enabled: formData.get("multi_currency_enabled") === "on" ? "1" : "0",
    auto_detect_locale: formData.get("auto_detect_locale") === "on" ? "1" : "0",
  };

  await setSettings(values);
  revalidatePath("/admin/settings");
  revalidatePath("/");
}

export async function saveAuthSettings(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  await setSettings({
    auth_google_enabled: formData.get("auth_google_enabled") === "on" ? "1" : "0",
    auth_google_client_id: String(formData.get("auth_google_client_id") || "").trim(),
    auth_google_client_secret: String(formData.get("auth_google_client_secret") || "").trim(),
    auth_google_allow_email_linking: formData.get("auth_google_allow_email_linking") === "on" ? "1" : "0",
  });

  revalidatePath("/admin/settings/auth");
  revalidatePath("/login");
  revalidatePath("/signup");

  // Oauth bilgilerinin güncellenmesi için sunucuyu PM2 ile yeniden başlat
  exec("pm2 restart optismm", (err) => {
    if (err) console.error("[PM2 Restart Error]:", err);
  });
}
