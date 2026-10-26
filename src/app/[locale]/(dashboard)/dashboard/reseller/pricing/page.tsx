import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";

export default async function ResellerPricingPage() {
  const session = await auth();

  if (session?.user.role !== "RESELLER") {
    redirect("/dashboard");
  }

  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  const t = await getTranslations("resellerPricing");

  let services: Array<{
    id: string;
    name: string;
    price: number;
    retailPrice: number | null;
    resellerPrice: number | null;
    category: { name: string };
  }> = [];

  try {
    services = await db.service.findMany({
      where: { status: true },
      select: {
        id: true,
        name: true,
        price: true,
        retailPrice: true,
        resellerPrice: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      take: 100,
    });
  } catch {
    const fallback = await db.service.findMany({
      where: { status: true },
      select: {
        id: true,
        name: true,
        price: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      take: 100,
    });

    services = fallback.map((service) => ({
      ...service,
      retailPrice: null,
      resellerPrice: null,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("subtitle")}
        </p>
      </div>
      <Card className="border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t("priceRules")}
            <Badge variant="secondary">{services.length} {t("services")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 && (
            <p className="text-muted-foreground">{t("noServices")}</p>
          )}
          {services.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("service")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("retail")}</TableHead>
                  <TableHead>{t("reseller")}</TableHead>
                  <TableHead>{t("margin")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => {
                  const retail = service.retailPrice ?? service.price;
                  const reseller = service.resellerPrice ?? service.price;
                  const margin = retail - reseller;

                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-muted-foreground">{service.category.name}</TableCell>
                      <TableCell>{fp(retail)}</TableCell>
                      <TableCell>{fp(reseller)}</TableCell>
                      <TableCell>
                        <Badge variant={margin > 0 ? "default" : "outline"}>
                          {fp(margin)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
