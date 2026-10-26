import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { getAppOrigin } from "@/lib/app-url";
import { buildShopierAuthorizeUrl, SHOPIER_CALLBACK_PATH } from "@/lib/shopier";

/**
 * Admin "Shopier'ı Bağla" akışı: state üretip cookie'ye koyar,
 * satıcıyı Shopier onay ekranına yönlendirir.
 */
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${getAppOrigin()}${SHOPIER_CALLBACK_PATH}`;
  const authorizeUrl = buildShopierAuthorizeUrl({ redirectUri, state });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("shopier_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
