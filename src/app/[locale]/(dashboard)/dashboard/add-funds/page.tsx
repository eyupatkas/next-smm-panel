import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSettings } from "@/lib/settings";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";
import { AddFundsClient } from "@/components/dashboard/AddFundsClient";

function paymentVariant(status: string): "secondary" | "default" | "destructive" {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "destructive";
  return "secondary";
}

export default async function AddFundsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  const t = await getTranslations("addFundsPage");

  const [payments, settings] = await Promise.all([
    db.payment.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        amount: true,
        method: true,
        externalId: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getSettings(["bank_transfer_enabled", "bank_transfer_iban", "bank_transfer_holder", "bank_transfer_bank", "cryptomus_enabled"]),
  ]);

  const methods = [
    { value: "BANK_TRANSFER", label: "Havale / EFT", enabled: (settings.bank_transfer_enabled || "1") === "1" },
    { value: "CRYPTOMUS", label: "Cryptomus (Kripto Ödeme)", enabled: settings.cryptomus_enabled === "1" },
  ].filter((method) => method.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <AddFundsClient
        methods={methods}
        currency={currency}
        bankAccount={{
          holder: settings.bank_transfer_holder || "Eyüp Aktaş",
          bank: settings.bank_transfer_bank || "Enpara bank",
          iban: settings.bank_transfer_iban || "TR79 0015 7000 0000 0128 4138 92",
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("recentRequests")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noRequests")}</p>
          )}
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <p className="font-medium">{payment.method}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {payment.createdAt.toLocaleString("tr-TR")} · #{payment.id.slice(0, 8)}
                </p>
                {payment.method === "BANK_TRANSFER" && payment.externalId && (
                  <p className="mt-1 text-xs font-mono text-emerald-500">Transfer açıklaması: {payment.externalId}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">{fp(Number(payment.amount))}</p>
                <Badge variant={paymentVariant(payment.status)}>{payment.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
