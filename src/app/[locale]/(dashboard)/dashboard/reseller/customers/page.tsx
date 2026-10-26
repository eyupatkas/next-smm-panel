import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";
import { ResellerCustomersClient } from "@/components/dashboard/ResellerCustomersClient";

export default async function ResellerCustomersPage() {
  const session = await auth();

  if (session?.user.role !== "RESELLER") {
    redirect("/dashboard");
  }

  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  const t = await getTranslations("resellerCustomers");

  let customers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    balance: number;
    spent: number;
  }> = [];

  try {
    const raw = await db.user.findMany({
      where: { parentId: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        spent: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    customers = raw.map((c) => ({
      ...c,
      balance: Number(c.balance),
      spent: Number(c.spent),
    }));
  } catch {
    customers = [];
  }

  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    linkedCustomers: t("linkedCustomers"),
    accounts: t("accounts"),
    noCustomers: t("noCustomers"),
    customer: t("customer"),
    email: t("email"),
    balance: t("balance"),
    totalSpent: t("totalSpent"),
    unnamed: t("unnamed"),
    addCustomer: t("addCustomer"),
    addFunds: t("addFunds"),
    edit: t("edit"),
    actions: t("actions"),
    name: t("name"),
    password: t("password"),
    amount: t("amount"),
    save: t("save"),
    newPassword: t("newPassword"),
    optional: t("optional"),
  };

  return (
    <ResellerCustomersClient
      customers={customers}
      formatPrice={fp}
      translations={translations}
    />
  );
}
