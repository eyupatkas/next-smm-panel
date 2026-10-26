import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, rtlLocales, type Locale } from "@/i18n/routing";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { hreflangAlternates, canonicalUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: {
      canonical: canonicalUrl(locale, "/"),
      languages: hreflangAlternates("/"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRTL = rtlLocales.includes(locale as Locale);

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <FavoritesProvider>
        <CurrencyProvider>
          {isRTL ? (
            <div dir="rtl" lang={locale}>
              {children}
            </div>
          ) : (
            children
          )}
        </CurrencyProvider>
      </FavoritesProvider>
    </NextIntlClientProvider>
  );
}
