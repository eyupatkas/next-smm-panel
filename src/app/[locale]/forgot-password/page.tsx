import type { Metadata } from "next";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/actions/dashboard-actions";

export const metadata: Metadata = {
  title: "Şifremi Unuttum | OptiSMM",
  description: "OptiSMM hesabınız için şifre sıfırlama talebi oluşturun.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  async function requestPasswordResetAction(formData: FormData) {
    "use server";

    await requestPasswordReset(formData);
  }

  return (
    <AuthPageShell title="Şifremi Unuttum" subtitle="Hesabınızın e-posta adresini girin, sıfırlama talebinizi oluşturalım.">
      <Card className="w-full border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle>Sifremi Unuttum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={requestPasswordResetAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" placeholder="admin@example.com" required />
            </div>
            <Button className="w-full" type="submit">
              Sifirlama Talebi Gonder
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Mail servisi bagli olmadigi icin talep kaydi olusturulur; bir sonraki turda token bazli reset akisi eklenmelidir.
          </p>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Girise geri don
          </Link>
        </CardFooter>
      </Card>
    </AuthPageShell>
  );
}

