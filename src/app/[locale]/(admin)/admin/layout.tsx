import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar, SidebarDrawer } from "@/components/layout/Sidebar";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { AdminProviderBalances } from "@/components/admin/AdminProviderBalances";
import { AdminUserMenu } from "@/components/admin/AdminUserMenu";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin | OptiSMM",
    template: "%s | OptiSMM Admin",
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true },
  });

  const newUsersSince = new Date();
  newUsersSince.setDate(newUsersSince.getDate() - 1);

  const initials = (user?.name || "Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  // Admin notification data
  const [notifications, openTickets, newUsersToday, pendingOrders] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, title: true, message: true, read: true, link: true, createdAt: true },
    }),
    db.ticket.count({ where: { status: "OPEN" } }),
    db.user.count({
      where: {
        createdAt: { gte: newUsersSince },
        role: { not: "ADMIN" },
      },
    }),
    db.order.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
  ]);

  return (
    <div className="flex min-h-screen bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <Sidebar role="ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex min-h-16 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarDrawer role="ADMIN" title="Admin menusu" />

            <div className="md:hidden">
              <p className="text-sm font-semibold">Admin</p>
              <p className="text-xs text-muted-foreground">Yonetim paneli</p>
            </div>

            <AdminUserSearch />
          </div>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 lg:gap-4">
            <Badge variant="secondary" className="hidden md:inline-flex">
              <ShieldCheck size={14} className="mr-1" />
              ADMIN
            </Badge>

            <div className="hidden sm:block">
              <AdminProviderBalances />
            </div>

            <ThemeToggle compact className="hidden sm:inline-flex" />

            <AdminNotificationBell
              notifications={notifications.map((n) => ({
                ...n,
                createdAt: n.createdAt.toISOString(),
              }))}
              stats={{ newUsersToday, openTickets, pendingOrders }}
            />

            <AdminUserMenu
              name={user?.name || "Admin"}
              image={user?.image}
              initials={initials}
            />
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto px-4 py-4 font-display sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
