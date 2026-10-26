import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getGoogleAuthSettings } from "@/lib/auth-settings";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const googleSettings = await getGoogleAuthSettings();
  const googleEnabled = Boolean(googleSettings.enabled && googleSettings.clientId && googleSettings.clientSecret);

  return (
    <AuthPageShell title="Tekrar Hos Geldiniz" subtitle="Giris yapin ve sosyal medyanizi yonetmeye baslayin.">
      <LoginForm googleEnabled={googleEnabled} />
    </AuthPageShell>
  );
}
