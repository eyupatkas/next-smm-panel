"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsSidebar() {
  const pathname = usePathname();
  const items = [
    { href: "/admin/settings", label: "Genel Ayarlar" },
    { href: "/admin/settings/site", label: "Site Ayarları" },
    { href: "/admin/settings/pricing", label: "Zarar Önleyici Fiyat" },
    { href: "/admin/settings/auth", label: "Giriş Yöntemleri" },
    { href: "/admin/settings/payments", label: "Ödeme Ayarları" },
    { href: "/admin/settings/providers", label: "Sağlayıcılar" },
    { href: "/admin/settings/ai", label: "Yapay Zeka" },
    { href: "/admin/settings/ads", label: "Reklam Ayarları" },
  ];

  return (
    <aside className="h-fit rounded-xl border border-white/10 bg-card lg:sticky lg:top-24">
      <div className="border-b border-white/10 p-4">
        <p className="text-sm font-semibold">Sistem Ayarlari</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto p-2 lg:block lg:space-y-1 lg:overflow-visible">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

