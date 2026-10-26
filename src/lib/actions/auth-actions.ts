"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { getGoogleAuthSettings } from "@/lib/auth-settings";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/),
  email: z.email().trim().toLowerCase().max(254),
  phone: z.string().trim().max(30).nullable(),
  password: z.string().min(8).max(128)
    .regex(/[A-Za-z]/, "Şifre en az bir harf içermelidir.")
    .regex(/[0-9]/, "Şifre en az bir rakam içermelidir."),
});

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Lütfen tüm alanları doldurun." };
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/dashboard",
    });

    if (result?.error) {
      return { error: "Geçersiz e-posta veya şifre." };
    }

    return { success: "Giriş başarılı.", redirectTo: "/dashboard" };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Geçersiz e-posta veya şifre." };
        default:
          return { error: "Bir hata oluştu." };
      }
    }

    throw error;
  }
}

export async function signInWithGoogle() {
  const settings = await getGoogleAuthSettings();

  if (!settings.enabled || !settings.clientId || !settings.clientSecret) {
    redirect("/login?error=google_disabled");
  }

  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signup(formData: FormData) {
  const requestHeaders = await headers();
  const signupIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimit(`signup:${signupIp}`, 5, 60 * 60_000)) {
    return { error: "Çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email"),
    phone: String(formData.get("phone") ?? "").trim() || null,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Bilgilerinizi kontrol edin." };
  }
  const { name, username, email, phone, password } = parsed.data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "Bu e-posta adresi zaten kullanımda." };
  }

  const existingUsername = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUsername) {
    return { error: "Bu kullanıcı adı zaten alınmış." };
  }

  const jar = await cookies();
  const refCode = jar.get("refCode")?.value || null;

  let referredById: string | null = null;
  if (refCode) {
    const referrerUser = await db.user.findFirst({
      where: { referralCode: refCode },
      select: { id: true }
    });
    if (referrerUser) {
      referredById = referrerUser.id;
    }
  }

  // Tahmin edilemeyen, 64-bit referans kodu.
  const userRefCode = randomBytes(8).toString("hex").toUpperCase();

  try {
    await db.user.create({
      data: {
        name,
        username,
        email,
        phone,
        password: hashedPassword,
        referralCode: userRefCode,
        referredById,
      }
    });

    // Kayıt olayını izle
    const referrer = String(formData.get("_referrer") || "").trim().slice(0, 500) || null;
    const sessionId = String(formData.get("_sessionId") || "").trim().slice(0, 64) || null;
    const landingPage = String(formData.get("_landingPage") || "").trim().slice(0, 500) || null;
    const newUser = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (newUser) {
      try {
        await db.userEvent.create({
          data: {
            type: "signup",
            userId: newUser.id,
            sessionId,
            referrer,
            landingPage,
          },
        });
      } catch { /* analytics hatası kayıt akışını bozmasın */ }
    }

    // Kayıt sonrası otomatik giriş
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/dashboard",
    });

    if (result?.error) {
      return { error: "Kayit olustu fakat otomatik giris yapilamadi." };
    }

    return { success: "Kayit basarili.", redirectTo: "/dashboard" };

  } catch {
    return { error: "Kayıt işlemi sırasında bir hata oluştu." };
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
