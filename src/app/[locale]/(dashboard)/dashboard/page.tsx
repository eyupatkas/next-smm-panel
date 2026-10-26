import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ShoppingBag, 
  Zap, 
  Wallet,
  Activity,
  ArrowUpRight,
  Users,
  CircleDollarSign,
  Plus,
  CreditCard,
  LifeBuoy,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";
import { getEffectiveUserId } from "@/lib/get-effective-user";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";
import { Link } from "@/i18n/navigation";

export default async function DashboardPage() {
  const userId = await getEffectiveUserId();

  const [user, totalOrders, activeServices, openTickets, recentOrders, announcements] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, balance: true, spent: true, role: true },
    }),
    db.order.count({ where: { userId } }),
    db.service.count({ where: { status: true } }),
    db.ticket.count({ where: { userId, status: { not: "CLOSED" } } }),
    db.order.findMany({
      where: { userId },
      select: {
        id: true,
        quantity: true,
        charge: true,
        status: true,
        service: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.announcement.findMany({
      where: { active: true },
      orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        pinned: true,
      },
    }),
  ]);

  const isReseller = user?.role === "RESELLER";

  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  const t = await getTranslations("dashboardPage");
  const sidebar = await getTranslations("sidebar");

  const stats = isReseller
    ? [
        { title: t("totalResellerOrders"), value: totalOrders.toString(), icon: <ShoppingBag className="text-blue-500" />, trend: t("resellerTrend") },
        { title: t("resellerServices"), value: activeServices.toString(), icon: <Zap className="text-yellow-500" />, trend: t("live") },
        { title: t("resellerBalance"), value: fp(Number(user?.balance || 0)), icon: <CircleDollarSign className="text-green-500" />, trend: t("instant") },
        { title: t("customerSupport"), value: openTickets.toString(), icon: <Users className="text-purple-500" />, trend: t("tracking") },
      ]
    : [
        { title: t("totalOrders"), value: totalOrders.toString(), icon: <ShoppingBag className="text-blue-500" />, trend: t("current") },
        { title: t("activeServices"), value: activeServices.toString(), icon: <Zap className="text-yellow-500" />, trend: t("current") },
        { title: t("balance"), value: fp(Number(user?.balance || 0)), icon: <Wallet className="text-green-500" />, trend: t("instant") },
        { title: t("supportTickets"), value: openTickets.toString(), icon: <Activity className="text-purple-500" />, trend: t("open") },
      ];

  return (
    <div className="space-y-8 font-display">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{t("welcome", { name: user?.name || "" })} </h1>
          <p className="text-muted-foreground mt-2">
            {isReseller
              ? t("resellerDesc")
              : t("customerDesc")}
          </p>
        </div>
        <Badge variant={isReseller ? "secondary" : "outline"}>{isReseller ? t("resellerPanel") : t("customerPanel")}</Badge>
      </div>

      <nav aria-label="Hızlı işlemler" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { href: "/dashboard/new-order" as const, label: sidebar("newOrder"), icon: Plus },
          { href: "/dashboard/add-funds" as const, label: sidebar("addFunds"), icon: CreditCard },
          { href: "/dashboard/tickets" as const, label: sidebar("support"), icon: LifeBuoy },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <action.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="font-semibold">{action.label}</span>
            <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="glass border-white/10 shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary/20 transition-colors">
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                <ArrowUpRight size={14} />
                <span className="font-semibold">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass border-white/10 shadow-xl min-h-[400px]">
          <CardHeader>
            <CardTitle>{isReseller ? t("recentResellerOrders") : t("recentOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 && (
              <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                <div>
                  <ShoppingBag className="mx-auto mb-3 size-10 text-muted-foreground/60" aria-hidden="true" />
                  <p className="text-muted-foreground">{t("noOrders")}</p>
                  <Link
                    href="/dashboard/new-order"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {sidebar("newOrder")}
                  </Link>
                </div>
              </div>
            )}
            {recentOrders.length > 0 && (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("service")}</TableHead>
                    <TableHead>{t("orderNo")}</TableHead>
                    <TableHead>{t("quantity")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FavoriteToggleButton serviceId={order.service.id} className="h-8 w-8 shrink-0 rounded-lg" />
                          <span>{order.service.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">#{order.id.slice(0, 8)}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>{fp(Number(order.charge))}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            order.status === "COMPLETED"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : order.status === "CANCELED" || order.status === "REFUNDED"
                                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle>{isReseller ? t("resellerNotes") : t("announcements")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {announcements.length === 0 ? (
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-sm font-bold text-primary">{t("supportTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("supportDesc")}</p>
              </div>
            ) : (
              announcements.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.pinned
                      ? "p-4 rounded-xl border border-amber-500/30 bg-amber-500/10"
                      : "p-4 rounded-xl border border-white/10 bg-white/5"
                  }
                >
                  <div className="flex items-center gap-2">
                    <p className={item.pinned ? "text-sm font-bold text-amber-400" : "text-sm font-bold text-foreground"}>
                      {item.title}
                    </p>
                    {item.pinned ? (
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                        ONEMLI
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{item.content}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
