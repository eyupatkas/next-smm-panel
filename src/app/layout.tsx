import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { defaultLocale, locales } from "@/i18n/routing";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { SessionProvider } from "next-auth/react";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";
// Note: OG image artık Next.js opengraph-image.tsx convention'ıyla otomatik
// generate ediliyor (PNG, 1200x630). Bu URL sadece JSON-LD'deki Organization
// image alanı için fallback olarak korunuyor.
const ogImageUrl = `${siteUrl}/opengraph-image`;

import { hreflangAlternates, alternateOgLocales } from "@/lib/seo";

// `as-needed` prefix: tr prefix almaz, diğerleri alır + x-default
const languageAlternates = hreflangAlternates("/");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f7bff",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OptiSMM | Sosyal Medya Büyütme ve Bayi Paneli",
    template: "%s | OptiSMM",
  },
  description: "OptiSMM ile Instagram takipçi, TikTok beğeni, YouTube abone ve profesyonel sosyal medya büyütme hizmetlerini güvenli ödeme, hızlı teslimat ve bayi altyapısıyla yönetin.",
  keywords: [
    "OptiSMM", "smm panel", "sosyal medya paneli",
    "instagram takipçi satın al", "tiktok beğeni satın al",
    "youtube abone satın al", "sosyal medya hizmetleri",
    "reseller panel", "bayi paneli", "sosyal medya büyütme",
    "instagram takipçi", "tiktok beğeni", "youtube abone",
  ],
  applicationName: "OptiSMM",
  authors: [{ name: "OptiSMM", url: siteUrl }],
  creator: "OptiSMM",
  publisher: "OptiSMM",
  category: "business",
  classification: "Social Media Marketing Panel",
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "180x180" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    alternateLocale: alternateOgLocales("tr"),
    siteName: "OptiSMM",
    title: "OptiSMM | Güvenilir Sosyal Medya Büyütme ve Bayi Paneli",
    description: "Instagram, TikTok, YouTube ve diğer platformlar için güvenilir sosyal medya büyütme hizmetleri, bayi altyapısı ve hızlı teslimat.",
    url: siteUrl,
    // images: opengraph-image.tsx convention otomatik inject ediyor
  },
  twitter: {
    card: "summary_large_image",
    site: "@optismm",
    creator: "@optismm",
    title: "OptiSMM | Güvenilir Sosyal Medya Büyütme ve Bayi Paneli",
    description: "Profesyonel sosyal medya büyütme hizmetleri. Hızlı teslimat, güvenli ödeme, bayi altyapısı.",
    // twitter:images: opengraph-image.tsx convention otomatik inject ediyor
  },
  alternates: {
    canonical: siteUrl,
    languages: languageAlternates,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "OptiSMM",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icon.svg`,
          width: 180,
          height: 180,
        },
        image: ogImageUrl,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          availableLanguage: ["Turkish", "English"],
          contactOption: "TollFree",
        },
        sameAs: [
          "https://wa.me/908503055213",
          "https://www.instagram.com/optismm",
        ],
        areaServed: {
          "@type": "Country",
          name: "Turkey",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "OptiSMM",
        alternateName: ["Opti SMM", "OptiSMM SMM Panel"],
        url: siteUrl,
        inLanguage: defaultLocale,
        publisher: {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
        },
        // Google Sitelinks Search Box
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/services?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#webapp`,
        name: "OptiSMM SMM Panel",
        url: siteUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript",
        inLanguage: defaultLocale,
        availableLanguage: locales,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "TRY",
          lowPrice: "1.00",
          offerCount: "100+",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          ratingCount: "1280",
          bestRating: "5",
          worstRating: "1",
        },
      },
    ]
  };

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />

        {/* Preconnect — kritik 3. taraf kaynaklar için */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.paytr.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://wa.me" />

        {/* Coğrafi hedefleme (Türkiye odaklı) */}
        <meta name="geo.region" content="TR" />
        <meta name="geo.placename" content="Turkey" />
        <meta name="geo.position" content="39.925533;32.866287" />
        <meta name="ICBM" content="39.925533, 32.866287" />

        {/* OG görselleri */}
        <meta property="og:image" content={ogImageUrl} />
        <meta name="twitter:image" content={ogImageUrl} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {/* Google Tag (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-HEPG6BT0QF"
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-HEPG6BT0QF');
            gtag('config', 'AW-10832016569');
          `}
        </Script>

        <SessionProvider>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Toaster position="top-right" richColors />
            </TooltipProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
