import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppOrigin } from "@/lib/app-url";
import { setSettings } from "@/lib/settings";
import { exchangeShopierAuthorizationCode, SHOPIER_CALLBACK_PATH } from "@/lib/shopier";

/**
 * Shopier OAuth callback: state doğrular, kodu token'a çevirir,
 * token'ları ayar tablosuna yazar ve admin ödeme ayarlarına döndürür.
 */
export async function GET(request: NextRequest) {
  const origin = getAppOrigin();
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/admin/settings/payments?shopier=error&reason=${encodeURIComponent(reason)}`);

  const params = request.nextUrl.searchParams;
  if (params.get("error")) {
    return fail(params.get("error") ?? "erisim_reddedildi");
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return fail("eksik_parametre");

  const jar = await cookies();
  const expectedState = jar.get("shopier_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return fail("state_eslesmedi");
  }

  try {
    const token = await exchangeShopierAuthorizationCode({
      code,
      redirectUri: `${origin}${SHOPIER_CALLBACK_PATH}`,
    });

    await setSettings({
      shopier_oauth_access_token: token.accessToken,
      ...(token.refreshToken ? { shopier_oauth_refresh_token: token.refreshToken } : {}),
      ...(token.expiresIn ? { shopier_oauth_expires_at: new Date(Date.now() + token.expiresIn * 1000).toISOString() } : {}),
      ...(token.scope ? { shopier_oauth_scope: token.scope } : {}),
      shopier_oauth_connected_at: new Date().toISOString(),
    });

    const response = NextResponse.redirect(`${origin}/admin/settings/payments?shopier=connected`);
    response.cookies.delete("shopier_oauth_state");
    return response;
  } catch (error) {
    console.error("[Shopier OAuth] token değişimi başarısız:", error);
    return fail("token_degisimi_basarısız");
  }
}
