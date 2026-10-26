"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth-actions";
import { useTranslations } from "next-intl";
import {
  AlertTriangle, 
  LayoutDashboard, 
  ShoppingCart, 
  ListOrdered, 
  Wallet, 
  HeadphonesIcon, 
  LogOut, 
  ShieldCheck,
  Users,
  Settings2,
  Package,
  Package2,
  KeyRound,
  RadioTower,
  Layers,
  Store,
  Newspaper,
  Megaphone,
  RefreshCw,
  BadgeCheck,
  UserCheck,
  BarChart2,
  CreditCard,
  CalendarClock,
  Menu,
  Heart,
  Sparkles,
  MessageSquare,
  Trophy,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/BrandMark";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SidebarProps {
  role: "USER" | "ADMIN" | "RESELLER";
}

type SidebarNavProps = SidebarProps & {
  className?: string;
  onNavigate?: () => void;
};

function SidebarNav({ role, className, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");

  const userMenu = [
    { icon: LayoutDashboard, label: t("dashboard"), href: "/dashboard" },
    { icon: Sparkles, label: t("aiOrder"), href: "/dashboard/ai-order" },
    { icon: ShoppingCart, label: t("newOrder"), href: "/dashboard/new-order" },
    { icon: ListOrdered, label: t("massOrder"), href: "/dashboard/mass-order" },
    { icon: ListOrdered, label: t("myOrders"), href: "/dashboard/orders" },
    { icon: CalendarClock, label: t("scheduled"), href: "/dashboard/scheduled" },
    { icon: Wallet, label: t("addFunds"), href: "/dashboard/add-funds" },
    { icon: Store, label: t("serviceList"), href: "/dashboard/services" },
    { icon: Heart, label: t("favorites"), href: "/dashboard/favorites" },
    { icon: Package2, label: t("readyPackages"), href: "/dashboard/packages" },
    { icon: Trophy, label: t("growthQuests"), href: "/dashboard/growth-quests" },
    { icon: Users, label: t("referrals"), href: "/dashboard/referrals" },
    { icon: HeadphonesIcon, label: t("support"), href: "/dashboard/tickets" },
    { icon: RefreshCw, label: t("updates"), href: "/dashboard/updates" },
    { icon: KeyRound, label: t("accountApi"), href: "/dashboard/settings" },
  ];

  const adminMenu = [
    { icon: ShieldCheck, label: t("adminPanel"), href: "/admin" },
    { icon: BarChart2, label: t("analytics"), href: "/admin/analytics" },
    { icon: ListOrdered, label: t("allOrders"), href: "/admin/orders" },
    { icon: AlertTriangle, label: t("stuckOrders"), href: "/admin/stuck-orders" },
    { icon: RefreshCw, label: t("refills"), href: "/admin/refills" },
    { icon: CalendarClock, label: t("scheduledOrders"), href: "/admin/scheduled-orders" },
    { icon: HeadphonesIcon, label: t("supportTickets"), href: "/admin/tickets" },
    { icon: Users, label: t("users"), href: "/admin/users" },
    { icon: UserCheck, label: t("resellerApps"), href: "/admin/reseller-applications" },
    { icon: CreditCard, label: t("finance"), href: "/admin/finance" },
    { icon: Package, label: t("servicesMgmt"), href: "/admin/services" },
    { icon: Heart, label: t("favorites"), href: "/admin/favorites" },
    { icon: Layers, label: t("packages"), href: "/admin/packages" },
    { icon: Newspaper, label: t("blog"), href: "/admin/blog" },
    { icon: Megaphone, label: t("announcements"), href: "/admin/announcements" },
    { icon: RadioTower, label: t("providerLogs"), href: "/admin/provider-logs" },
    { icon: Sparkles, label: t("agentLogs"), href: "/admin/agent-logs" },
    { icon: MessageSquare, label: t("aiChats"), href: "/admin/ai-chats" },
    { icon: Terminal, label: t("systemLogs"), href: "/admin/logs" },
    { icon: Settings2, label: t("systemSettings"), href: "/admin/settings" },
  ];

  const menuItems =
    role === "ADMIN" ? adminMenu : role === "RESELLER" ? [...userMenu] : [
      ...userMenu,
      { icon: BadgeCheck, label: t("resellerApply"), href: "/dashboard/reseller/apply" },
    ];

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-card text-foreground", className)}>
      <div className="shrink-0 p-6">
        <Link href="/" className="inline-flex items-center">
          <BrandMark size="sm" />
        </Link>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {role === "ADMIN"
              ? t("adminMenu")
              : role === "RESELLER"
                ? t("resellerMenu")
                : t("customerMenu")}
          </p>
          <ThemeToggle compact className="lg:hidden" />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 overscroll-contain">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <form action={logout} className="shrink-0 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button type="submit" variant="ghost" className="w-full justify-start rounded-lg text-muted-foreground transition-colors hover:text-destructive">
          <LogOut size={18} className="mr-3" />
          {t("logout")}
        </Button>
      </form>
    </div>
  );
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="hidden h-full w-64 shrink-0 border-r border-border lg:flex">
      <SidebarNav role={role} className="w-full" />
    </aside>
  );
}

export function SidebarDrawer({ role, title = "Panel menusu" }: SidebarProps & { title?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden border-white/10 bg-white/5 text-foreground shadow-sm"
            aria-label={title}
          />
        }
      >
        <Menu size={18} />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-full w-[88vw] max-w-xs flex-col gap-0 overflow-hidden border-border bg-card p-0 text-foreground"
      >
        <SheetHeader className="shrink-0 border-b border-border pb-4">
          <SheetTitle>OptiSMM</SheetTitle>
          <SheetDescription>{title}</SheetDescription>
        </SheetHeader>
        <SidebarNav role={role} className="min-h-0 flex-1" onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
