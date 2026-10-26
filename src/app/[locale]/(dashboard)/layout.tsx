import { Sidebar, SidebarDrawer } from "@/components/layout/Sidebar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { AnalyticsTracker } from "@/components/shared/AnalyticsTracker";
import { RecoveryNotification } from "@/components/dashboard/RecoveryNotification";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | OptiSMM",
    template: "%s | OptiSMM Dashboard",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Admin impersonation: if admin has set the cookie, use that user's data
  const jar = await cookies();
  const impersonateId = session.user.role === "ADMIN"
    ? jar.get("admin_impersonate")?.value
    : undefined;

  const activeUserId = impersonateId ?? session.user.id;

  // Admin'ler artık dashboard'a da erişebilir (panel geçişi için)
  const user = await db.user.findUnique({
    where: { id: activeUserId },
    select: {
      name: true,
      email: true,
      role: true,
      balance: true,
      image: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const balanceFormatted = formatPrice(Number(user.balance), currency, intlLocale);

  // Fetch notifications for the active user
  const notifications = await db.notification.findMany({
    where: { userId: activeUserId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      read: true,
      link: true,
      createdAt: true,
    },
  });

  const effectiveRole = impersonateId ? user.role : (session.user.role ?? user.role);
  const sidebarRole = effectiveRole === "ADMIN" ? "RESELLER" : effectiveRole;

  return (
    <div className="flex min-h-screen bg-background text-foreground lg:h-screen lg:overflow-hidden">
      {/* Sadece heartbeat — dashboard trafik verisini kirletmez, online sayımı doğru yapar */}
      <AnalyticsTracker heartbeatOnly isAdmin={effectiveRole === "ADMIN"} />
      <Sidebar role={sidebarRole as "USER" | "ADMIN" | "RESELLER"} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {impersonateId && (
          <ImpersonationBanner
            impersonatedName={user.name ?? "İsimsiz"}
            impersonatedEmail={user.email ?? ""}
          />
        )}
        <DashboardNavbar
          menuButton={<SidebarDrawer role={sidebarRole as "USER" | "ADMIN" | "RESELLER"} title="Panel menusu" />}
          user={{
            name: user.name,
            role: effectiveRole,
            image: user.image,
            balance: Number(user.balance),
          }}
          balanceFormatted={balanceFormatted}
          notifications={notifications.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
          }))}
        />

        <main className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 font-display sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <RecoveryNotification />
      </div>
    </div>
  );
}
