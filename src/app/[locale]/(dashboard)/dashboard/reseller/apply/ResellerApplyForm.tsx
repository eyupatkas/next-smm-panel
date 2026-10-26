"use client";

import { useActionState } from "react";
import { submitResellerApplication } from "@/lib/actions/reseller-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";

export function ResellerApplyForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(submitResellerApplication, {});
  const t = useTranslations("resellerApplyPage");

  if (disabled) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-8 text-center">
          <p className="text-amber-500 font-medium">{t("hasPendingApplication") || "Bekleyen bir başvurunuz var."}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {t("pendingDesc") || "Başvurunuz inceleniyor. En kısa sürede size dönüş yapılacaktır."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10">
      <CardHeader>
        <CardTitle>{t("formTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 p-3 rounded-lg">{state.success}</p>
          )}

          <div className="space-y-2">
            <Label>{t("companyName")}</Label>
            <Input name="company" placeholder={t("companyPlaceholder") || "Şirket adınız"} />
          </div>

          <div className="space-y-2">
            <Label>{t("website")}</Label>
            <Input name="website" placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label>{t("applyMessage")} *</Label>
            <textarea
              name="message"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder={t("applyMessagePlaceholder") || "Neden bayi olmak istediğinizi..."}
              required
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={pending}>
            <Send size={16} />
            {pending ? (t("sending") || "Gönderiliyor...") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
