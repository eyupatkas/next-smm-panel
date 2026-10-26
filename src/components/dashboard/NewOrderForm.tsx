"use client";

import { useActionState, useEffect, useRef } from "react";
import { createOrder } from "@/lib/actions/order-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/context/CurrencyContext";
import { unitPriceSuffix, type ClientPricingMode } from "@/lib/client-pricing";

type ServiceOption = {
  id: string;
  name: string;
  min: number;
  max: number;
  unitPrice: number;
  pricingMode?: ClientPricingMode;
  categoryName: string;
};

export function NewOrderForm({ services }: { services: ServiceOption[] }) {
  const [state, formAction, pending] = useActionState(createOrder, {});
  const t = useTranslations("newOrderForm");
  const { format: fp } = useCurrency();
  const referrerInputRef = useRef<HTMLInputElement>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);
  const landingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refVal = document.referrer || "";
    const landVal = window.location.pathname + window.location.search;
    let sidVal = "";
    try {
      const stored = localStorage.getItem("_tid");
      if (stored) sidVal = stored;
    } catch { /* ignore */ }

    if (referrerInputRef.current) referrerInputRef.current.value = refVal;
    if (landingInputRef.current) landingInputRef.current.value = landVal;
    if (sessionInputRef.current) sessionInputRef.current.value = sidVal;
  }, []);

  const grouped = services.reduce<Record<string, ServiceOption[]>>((acc, service) => {
    if (!acc[service.categoryName]) acc[service.categoryName] = [];
    acc[service.categoryName].push(service);
    return acc;
  }, {});

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-card to-card/60 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="_referrer" ref={referrerInputRef} />
          <input type="hidden" name="_sessionId" ref={sessionInputRef} />
          <input type="hidden" name="_landingPage" ref={landingInputRef} />
          {state.error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {state.success}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="serviceId">{t("service")}</Label>
            <select
              id="serviceId"
              name="serviceId"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">{t("selectService")}</option>
              {Object.entries(grouped).map(([category, categoryServices]) => (
                <optgroup key={category} label={category}>
                  {categoryServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} | {fp(service.unitPrice)} {unitPriceSuffix(service.pricingMode)} | {service.min}-{service.max}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">{t("targetLink")}</Label>
            <Input id="link" name="link" placeholder="https://instagram.com/..." className="h-11" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">{t("quantity")}</Label>
            <Input id="quantity" name="quantity" type="number" min={1} placeholder="1000" className="h-11" required />
          </div>

          <Button type="submit" className="h-11 px-6" disabled={pending}>
            {pending ? t("creating") : t("createOrder")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
