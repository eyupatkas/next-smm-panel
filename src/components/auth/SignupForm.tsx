"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithGoogle, signup } from "@/lib/actions/auth-actions";

type SignupFormProps = {
  googleEnabled: boolean;
};

export function SignupForm({ googleEnabled }: SignupFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const referrerRef = useRef("");
  const sessionIdRef = useRef("");
  const landingPageRef = useRef("");

  useEffect(() => {
    landingPageRef.current = window.location.pathname + window.location.search;
    try {
      const storedTid = localStorage.getItem("_tid");
      if (storedTid) sessionIdRef.current = storedTid;

      const storedRef = localStorage.getItem("_initial_referrer");
      if (storedRef) {
        referrerRef.current = storedRef;
      } else if (document.referrer && !document.referrer.includes(window.location.hostname)) {
        referrerRef.current = document.referrer;
      }
    } catch {
      referrerRef.current = document.referrer || "";
    }
  }, []);

  async function onSubmit(formData: FormData) {
    formData.set("_referrer", referrerRef.current);
    formData.set("_sessionId", sessionIdRef.current);
    formData.set("_landingPage", landingPageRef.current);
    setLoading(true);
    try {
      const result = await signup(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Kayit basarili! Hos geldiniz.");
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass border-white/10 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Kayit Ol</CardTitle>
          <CardDescription>Bilgilerinizi girerek saniyeler icinde baslayin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 font-display">
          {googleEnabled && (
            <>
              <form action={signInWithGoogle}>
                <Button type="submit" variant="outline" className="glass h-11 w-full border-white/5 text-foreground hover:bg-white/5">
                  <FaGoogle size={17} className="mr-2" /> Google ile kaydol / giris yap
                </Button>
              </form>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 font-semibold text-muted-foreground">Ya da e-posta ile kaydol</span></div>
              </div>
            </>
          )}

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onSubmit(formData);
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold text-foreground">Ad Soyad</Label>
                <Input id="name" name="name" placeholder="Ad Soyad" required className="glass border-white/5 text-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="font-semibold text-foreground">Kullanici Adi</Label>
                <Input id="username" name="username" placeholder="kullanici" required className="glass border-white/5 text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-foreground">E-posta</Label>
              <Input id="email" name="email" type="email" placeholder="e-posta@ornek.com" required className="glass border-white/5 text-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="font-semibold text-foreground">Telefon</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+90 5XX XXX XX XX" className="glass border-white/5 text-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-foreground">Sifre</Label>
              <Input id="password" name="password" type="password" required className="glass border-white/5 text-foreground" />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl" size="lg" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Hesap Olustur"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-1 text-sm text-muted-foreground">
          Zaten hesabiniz var mi? <Link href="/login" className="font-semibold text-primary hover:underline">Giris Yapin</Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}