/**
 * Proxy: next-intl locale routing + IP ban kontrolü
 *
 * Auth route protection is primarily handled at layout level
 * (dashboard/admin layouts redirect to /login if no session).
 * This middleware handles locale routing for all public/private paths.
 *
 * Auto-detection logic:
 * 1. If NEXT_LOCALE_MANUAL cookie is set, skip auto-detection (user chose manually)
 * 2. Check CF-IPCountry / X-Vercel-IP-Country headers for geo-based locale/currency
 * 3. Falls back to Accept-Language header
 */
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { db } from "./lib/db";
import { locales, type Locale } from "./i18n/routing";
import {
  CURRENCY_COOKIE,
  CURRENCY_MANUAL_COOKIE,
  currencyCodeForCountry,
  defaultCurrencyCodeForLocale,
  normalizeCurrencyCode,
  type CurrencyCode,
} from "./lib/currency";

const intlMiddleware = createMiddleware(routing);

/** Map country codes (ISO 3166-1 alpha-2) to supported locales */
const countryToLocale: Record<string, Locale> = {
  TR: "tr",
  US: "en", GB: "en", AU: "en", CA: "en", NZ: "en", IE: "en",
  DE: "de", AT: "de", CH: "de",
  SA: "ar", AE: "ar", EG: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar", JO: "ar", IQ: "ar", LB: "ar", MA: "ar", DZ: "ar", TN: "ar", LY: "ar", SD: "ar", YE: "ar",
  CN: "zh", TW: "zh", HK: "zh", MO: "zh",
  FR: "fr", BE: "fr", SN: "fr", CI: "fr",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es",
  RU: "ru", BY: "ru", KZ: "ru", UA: "ru",
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt",
  JP: "ja",
  KR: "ko",
  IT: "it",
};

const MANUAL_COOKIE = "NEXT_LOCALE_MANUAL";
const LOCALE_COOKIE = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function getPathLocale(pathname: string) {
  return locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

function stripLocalePrefix(pathname: string) {
  const matchedLocale = getPathLocale(pathname);
  if (!matchedLocale) return pathname;

  const stripped = pathname.slice(matchedLocale.length + 1);
  return stripped.startsWith("/") ? stripped : stripped ? `/${stripped}` : "/";
}

function withLocale(pathname: string, locale: Locale) {
  const cleanPath = stripLocalePrefix(pathname);
  return cleanPath === "/" ? `/${locale}` : `/${locale}${cleanPath}`;
}

function detectCountry(request: NextRequest) {
  return (
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("x-country-code") ||
    ""
  ).toUpperCase();
}

function detectLocaleFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  return header
    .split(",")
    .map((part) => {
      const [tag, qValue] = part.trim().split(";q=");
      const quality = qValue ? Number(qValue) : 1;
      return { tag: tag.toLowerCase(), quality: Number.isFinite(quality) ? quality : 1 };
    })
    .sort((a, b) => b.quality - a.quality)
    .map(({ tag }) => locales.find((locale) => tag === locale || tag.startsWith(`${locale}-`)))
    .find(Boolean) ?? null;
}

function detectCurrency(request: NextRequest, locale: Locale, country: string, preferLocaleDefault = false): CurrencyCode {
  const selectedCurrency = normalizeCurrencyCode(request.cookies.get(CURRENCY_COOKIE)?.value);
  if (selectedCurrency) return selectedCurrency;
  if (!preferLocaleDefault) {
    const countryCurrency = currencyCodeForCountry(country);
    if (countryCurrency) return countryCurrency;
  }
  return defaultCurrencyCodeForLocale(locale);
}

// ─── IP Ban Cache ─────────────────────────────────────────────────────────────
let bannedIps = new Set<string>();
let bannedIpsLastRefreshed = 0;
const BANNED_IP_REFRESH_MS = 60_000;

async function refreshBannedIps() {
  const now = Date.now();
  if (now - bannedIpsLastRefreshed < BANNED_IP_REFRESH_MS) return;
  try {
    const rows = await db.bannedIp.findMany({ select: { ip: true } });
    bannedIps = new Set(rows.map((r) => r.ip));
    bannedIpsLastRefreshed = now;
  } catch {
    // Cache bozulsa bile uygulama çalışmalı
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function setCookie(response: NextResponse, name: string, value: string) {
  response.cookies.set(name, value, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
}

function persistLocaleCookies(response: NextResponse, locale: Locale, manual = false) {
  setCookie(response, LOCALE_COOKIE, locale);
  if (manual) setCookie(response, MANUAL_COOKIE, "1");
}

function persistCurrencyCookie(
  response: NextResponse,
  request: NextRequest,
  locale: Locale,
  country: string,
  preferLocaleDefault = false,
) {
  persistReferralCookie(response, request);
  if (request.cookies.get(CURRENCY_MANUAL_COOKIE)?.value === "1") return;
  const currency = detectCurrency(request, locale, country, preferLocaleDefault);
  setCookie(response, CURRENCY_COOKIE, currency);
}

function persistReferralCookie(response: NextResponse, request: NextRequest) {
  const refParam = request.nextUrl.searchParams.get("ref");
  if (refParam) {
    response.cookies.set("refCode", refParam, {
      maxAge: 30 * 24 * 60 * 60, // 30 gün
      path: "/",
      sameSite: "lax",
    });
  }
}

export default async function middleware(request: NextRequest) {
  // IP Ban kontrolü
  await refreshBannedIps();
  const clientIp = getClientIp(request);
  if (bannedIps.has(clientIp)) {
    return new NextResponse("Erişim engellendi.", { status: 403 });
  }

  const pathname = request.nextUrl.pathname;

  // API route'lar için sadece IP ban kontrolü yap, intl middleware atla
  if (pathname.startsWith("/api/")) {
    await refreshBannedIps();
    const clientIp = getClientIp(request);
    if (bannedIps.has(clientIp)) {
      return new NextResponse("Erişim engellendi.", { status: 403 });
    }
    return NextResponse.next();
  }

  const manualCookie = request.cookies.get(MANUAL_COOKIE)?.value;
  const selectedLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const pathLocale = getPathLocale(pathname);
  const country = detectCountry(request);

  // If user manually selected a locale, enforce it explicitly on every request.
  if (manualCookie === "1" && selectedLocale && locales.includes(selectedLocale)) {
    if (selectedLocale === "tr") {
      if (pathLocale && pathLocale !== "tr") {
        const url = request.nextUrl.clone();
        url.pathname = stripLocalePrefix(pathname);
        const response = NextResponse.redirect(url);
        persistLocaleCookies(response, selectedLocale, true);
        persistCurrencyCookie(response, request, selectedLocale, country, true);
        return response;
      }

      const response = intlMiddleware(request);
      persistLocaleCookies(response, selectedLocale, true);
      persistCurrencyCookie(response, request, selectedLocale, country, true);
      return response;
    }

    if (pathLocale !== selectedLocale) {
      const url = request.nextUrl.clone();
      url.pathname = withLocale(pathname, selectedLocale);
      const response = NextResponse.redirect(url);
      persistLocaleCookies(response, selectedLocale, true);
      persistCurrencyCookie(response, request, selectedLocale, country, true);
      return response;
    }

    const response = intlMiddleware(request);
    persistLocaleCookies(response, selectedLocale, true);
    persistCurrencyCookie(response, request, selectedLocale, country, true);
    return response;
  }

  const countryLocale = countryToLocale[country] as Locale | undefined;
  const browserLocale = detectLocaleFromAcceptLanguage(request.headers.get("accept-language"));
  const cookieLocale = selectedLocale && locales.includes(selectedLocale) ? selectedLocale : null;
  const detectedLocale = pathLocale ?? countryLocale ?? browserLocale ?? cookieLocale ?? routing.defaultLocale;

  if (detectedLocale && locales.includes(detectedLocale)) {
    const hasLocalePrefix = Boolean(pathLocale);

    if (!hasLocalePrefix && detectedLocale !== "tr") {
      const url = request.nextUrl.clone();
      url.pathname = `/${detectedLocale}${pathname}`;
      const response = NextResponse.redirect(url);
      persistLocaleCookies(response, detectedLocale);
      persistCurrencyCookie(response, request, detectedLocale, country);
      return response;
    }
  }

  const response = intlMiddleware(request);
  persistLocaleCookies(response, detectedLocale);
  persistCurrencyCookie(response, request, detectedLocale, country);
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    // Statik varlıklar (manifest, ikonlar, görseller, fontlar vb.) ve uzantısız
    // metadata rotaları (opengraph-image) locale yönlendirmesine sokulmaz;
    // aksi hâlde middleware bunları [locale] sayfa rotasına çevirip 404 döndürür.
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|images|robots.txt|sitemap.*\\.xml|.*\\.html|opengraph-image|twitter-image|apple-icon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|json|webmanifest|mp4|webm|ogg|mp3|woff2?|ttf|otf)).*)",
  ],
};


