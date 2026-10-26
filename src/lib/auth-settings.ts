import { getSettings } from "@/lib/settings";

export const GOOGLE_AUTH_SETTING_KEYS = [
  "auth_google_enabled",
  "auth_google_client_id",
  "auth_google_client_secret",
  "auth_google_allow_email_linking",
] as const;

export type GoogleAuthSettings = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  allowEmailLinking: boolean;
};

export async function getGoogleAuthSettings(): Promise<GoogleAuthSettings> {
  const settings = await getSettings([...GOOGLE_AUTH_SETTING_KEYS]);
  const clientId = settings.auth_google_client_id || process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = settings.auth_google_client_secret || process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
  const enabledRaw = settings.auth_google_enabled || (clientId && clientSecret ? "1" : "0");

  return {
    enabled: enabledRaw === "1",
    clientId,
    clientSecret,
    allowEmailLinking: settings.auth_google_allow_email_linking !== "0",
  };
}

export function getGoogleCallbackUrl() {
  const baseUrl = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://optismm.com").replace(/\/$/, "");
  return `${baseUrl}/api/auth/callback/google`;
}