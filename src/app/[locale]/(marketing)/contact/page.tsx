import type { Metadata } from "next";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import {
  Phone,
  MessageCircle,
  Mail,
  Clock,
  HeadphonesIcon,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";

import { ContactForm } from "@/components/marketing/ContactForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("contact");
  const path = "/contact";
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDesc"),
      type: "website",
    },
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");

  const contactInfo = [
    {
      icon: MessageCircle,
      label: t("whatsapp"),
      value: "+90 850 305 52 13",
      href: "https://wa.me/908503055213",
      color: "text-green-400",
      bg: "bg-green-500/15",
      badge: t("active247"),
    },
    {
      icon: Phone,
      label: t("phone"),
      value: "+90 850 305 52 13",
      href: "tel:+908503055213",
      color: "text-blue-400",
      bg: "bg-blue-500/15",
      badge: null,
    },
    {
      icon: Mail,
      label: t("email"),
      value: "destek@optismm.com",
      href: "mailto:destek@optismm.com",
      color: "text-primary",
      bg: "bg-primary/15",
      badge: null,
    },
    ...(t("addressValue")
      ? [
          {
            icon: MapPin,
            label: t("address"),
            value: t("addressValue"),
            href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t("addressValue"))}`,
            color: "text-amber-400",
            bg: "bg-amber-500/15",
            badge: null,
          },
        ]
      : []),
  ];
  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto space-y-12">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <HeadphonesIcon size={20} />
            </div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">
              {t("label")}
            </p>
          </div>
          <h1 className="text-5xl font-bold font-display">{t("title")}</h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl">
            {t("subtitle")}
          </p>
        </div>

        {/* Contact Cards + Map Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Contact Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("label")}</h2>
            {contactInfo.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  item.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="block group"
              >
                <Card className="border-white/10 bg-card/40 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div
                      className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center ${item.color} shrink-0`}
                    >
                      <item.icon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-semibold group-hover:text-primary transition-colors truncate">
                        {item.value}
                      </p>
                    </div>
                    {item.badge && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0">
                        {item.badge}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </a>
            ))}

            {/* Working Hours */}
            <Card className="border-white/10 bg-card/40 backdrop-blur-sm mt-2">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="w-12 h-12 bg-violet-500/15 rounded-xl flex items-center justify-center text-violet-400 shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("workingHours")}</p>
                  <p className="font-semibold">{t("workingDays")}</p>
                  <p className="text-sm text-muted-foreground">{t("workingTime")}</p>
                </div>
                <Badge className="ml-auto bg-primary/20 text-primary border-primary/30 shrink-0">
                  {t("whatsapp247")}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Right: Contact Form */}
          <ContactForm />
        </div>

        {/* WhatsApp CTA */}
        <div className="rounded-[2rem] border border-green-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.15),transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.7))] p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400">
                  <MessageCircle size={22} />
                </div>
                <p className="text-xs uppercase tracking-[0.24em] text-green-400">
                  {t("ctaLabel")}
                </p>
              </div>
              <h3 className="text-2xl font-bold">{t("ctaTitle")}</h3>
              <p className="mt-2 text-muted-foreground">
                {t("ctaDesc")}
              </p>
            </div>
            <a
              href="https://wa.me/908503055213"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 transition-all hover:shadow-lg hover:shadow-green-500/25 hover:-translate-y-0.5 shrink-0"
            >
              <MessageCircle size={20} />
              {t("ctaBtn")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
