import { db } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/get-effective-user";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  changePassword,
  regenerateApiKey,
  updateProfile,
} from "@/lib/actions/dashboard-actions";
import { getLocale, getTranslations } from "next-intl/server";

export default async function DashboardSettingsPage() {
  const userId = await getEffectiveUserId();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      username: true,
      email: true,
      apiKey: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  async function updateProfileAction(formData: FormData) {
    "use server";

    await updateProfile(formData);
  }

  async function changePasswordAction(formData: FormData) {
    "use server";

    await changePassword(formData);
  }

  async function regenerateApiKeyAction() {
    "use server";

    await regenerateApiKey();
  }

  const locale = await getLocale();
  const t = await getTranslations("settingsPage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("profileInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProfileAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">{t("fullName")}</label>
                <input id="name" name="name" defaultValue={user.name || ""} required className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">{t("username")}</label>
                <input id="username" name="username" defaultValue={user.username || ""} required className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("email")}</label>
                <input value={user.email || ""} disabled className="flex h-11 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("role", { role: user.role })}</span>
                <span>{locale === "tr" ? "Kayıt" : "Registered"}: {user.createdAt.toLocaleDateString(locale)}</span>
              </div>
              <Button type="submit">{t("updateProfile")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("changePassword")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={changePasswordAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="currentPassword" className="text-sm font-medium">{t("currentPassword")}</label>
                <input id="currentPassword" name="currentPassword" type="password" required className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium">{t("newPassword")}</label>
                <input id="newPassword" name="newPassword" type="password" required className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">{t("confirmNewPassword")}</label>
                <input id="confirmPassword" name="confirmPassword" type="password" required className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <Button type="submit" variant="outline">{t("updatePassword")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardHeader>
          <CardTitle>{t("apiKey")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-background/80 p-4 font-mono text-sm break-all">
            {user.apiKey}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{t("apiKeyDesc")}</span>
          </div>
          <form action={regenerateApiKeyAction}>
            <Button type="submit">{t("refreshApiKey")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}