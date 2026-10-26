import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?source=pwa",
    name: "OptiSMM – SMM Panel & Sosyal Medya Büyütme",
    short_name: "OptiSMM",
    description:
      "OptiSMM ile Instagram takipçi, TikTok beğeni, YouTube abone ve profesyonel sosyal medya büyütme hizmetlerini güvenli ödeme ve hızlı teslimat ile yönetin.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#06111f",
    theme_color: "#2f7bff",
    lang: "tr",
    dir: "ltr",
    categories: ["business", "marketing", "social", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/favicon.svg",
        sizes: "64x64",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Servis Listesi",
        short_name: "Servisler",
        description: "Tüm SMM panel hizmetlerini incele",
        url: "/servis-listesi",
        icons: [{ src: "/icon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
      {
        name: "Sipariş Takibi",
        short_name: "Sipariş",
        description: "Siparişinizin durumunu görün",
        url: "/order-tracking",
        icons: [{ src: "/icon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
      {
        name: "Blog",
        short_name: "Blog",
        description: "Sosyal medya rehberleri",
        url: "/blog",
        icons: [{ src: "/icon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
    ],
  };
}