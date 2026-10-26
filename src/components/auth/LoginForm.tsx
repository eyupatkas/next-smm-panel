"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, signInWithGoogle } from "@/lib/actions/auth-actions";

type LoginFormProps = {
  googleEnabled: boolean;
};

export function LoginForm({ googleEnabled }: LoginFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");
    if (error === "OAuthAccountNotLinked") {
      toast.error("Bu e-posta daha once farkli bir giris yontemiyle kullanilmis.");
    }
    if (error === "google_disabled") {
      toast.error("Google ile giris su anda aktif degil.");
    }
  }, []);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await login(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Giris basarili! Yonlendiriliyorsunuz...");
        router.push(result?.redirectTo || "/dashboard");
      }
    } catch {
      toast.error("Bir hata olustu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass border-white/10 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Giris Yap</CardTitle>
          <CardDescription>E-posta ve sifrenizle devam edin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 font-display">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onSubmit(formData);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-foreground">E-posta</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="adiniz@ornek.com"
                required
                className="glass border-white/5 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password" className="font-semibold text-foreground">Sifre</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">Sifremi Unuttum</Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="glass border-white/5 text-foreground"
              />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl" size="lg" disabled={loading}>
              {loading ? "Giris Yapiliyor..." : "Giris Yap"}
            </Button>
          </form>

          {googleEnabled && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 font-semibold text-muted-foreground">Ya da sununla devam et</span></div>
              </div>

              <form action={signInWithGoogle}>
                <Button type="submit" variant="outline" className="glass h-11 w-full border-white/5 text-foreground hover:bg-white/5">
                  <FaGoogle size={17} className="mr-2" /> Google ile devam et
                </Button>
              </form>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-1 text-sm text-muted-foreground">
          Hesabiniz yok mu? <Link href="/signup" className="font-semibold text-primary hover:underline">Hemen Kaydolun</Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}