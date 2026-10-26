import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { getGoogleAuthSettings } from "@/lib/auth-settings";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const googleSettings = await getGoogleAuthSettings();
  const googleEnabled = Boolean(googleSettings.enabled && googleSettings.clientId && googleSettings.clientSecret);

  return (
    <AuthPageShell title="Ucretsiz Kaydolun" subtitle="Hemen hesabinizi olusturun ve avantajlardan yararlanin.">
      <SignupForm googleEnabled={googleEnabled} />
    </AuthPageShell>
  );
}
