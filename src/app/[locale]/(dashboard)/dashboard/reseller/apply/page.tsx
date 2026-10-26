import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ResellerApplyForm } from "./ResellerApplyForm";
import { getLocale, getTranslations } from "next-intl/server";

export default async function ResellerApplyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true },
  });

  if (!user) redirect("/login");
  if (user.role === "RESELLER") redirect("/dashboard/reseller/customers");

  // Check existing applications
  const applications = await db.resellerApplication.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, status: true, createdAt: true, adminNote: true },
  });

  const hasPending = applications.some((a) => a.status === "PENDING");

  const locale = await getLocale();
  const t = await getTranslations("resellerApplyPage");

  const benefits = [
    { title: t("wholesalePrices"), desc: t("benefitsWholesaleDesc") },
    { title: t("customerMgmt"), desc: t("benefitsCustomerDesc") },
    { title: t("apiAccess"), desc: t("benefitsApiDesc") },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("subtitle")}
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {benefits.map((b) => (
          <div key={b.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">{b.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* Previous Applications */}
      {applications.length > 0 && (
        <div className="rounded-xl border border-white/10 p-4 space-y-3">
          <p className="text-sm font-semibold">{t("previousApplications")}</p>
          {applications.map((app) => (
            <div key={app.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {app.createdAt.toLocaleDateString(locale)}
              </span>
              <span className={
                app.status === "APPROVED" ? "text-emerald-500 font-medium" :
                app.status === "REJECTED" ? "text-red-500 font-medium" :
                "text-amber-500 font-medium"
              }>
                {t(`status${app.status}` as any) || app.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <ResellerApplyForm disabled={hasPending} />
    </div>
  );
}
