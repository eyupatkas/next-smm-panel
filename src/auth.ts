import NextAuth from "next-auth";
import { cookies } from "next/headers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getGoogleAuthSettings } from "@/lib/auth-settings";
import { rateLimit } from "@/lib/rate-limit";

const googleAuthSettings = await getGoogleAuthSettings();

export const googleProviderConfigured = Boolean(
  googleAuthSettings.enabled && googleAuthSettings.clientId && googleAuthSettings.clientSecret
);

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  // Suppress expected JWTSessionError (stale/rotated-secret cookies) from
  // polluting the server log. Pages catch the error and treat user as guest.
  logger: {
    error(error: Error) {
      if (error.name === "JWTSessionError") return;
      console.error("[auth]", error);
    },
  },
  providers: [
    ...(googleProviderConfigured
      ? [
          Google({
            clientId: googleAuthSettings.clientId,
            clientSecret: googleAuthSettings.clientSecret,
            allowDangerousEmailAccountLinking: googleAuthSettings.allowEmailLinking,
          }),
        ]
      : []),
    Credentials({
      async authorize(credentials, request) {
        const email = typeof credentials.email === "string"
          ? credentials.email.trim().toLowerCase()
          : "";
        const password = typeof credentials.password === "string"
          ? credentials.password
          : "";

        if (!email || !password) return null;
        const forwarded = request?.headers?.get?.("x-forwarded-for");
        const ip = forwarded?.split(",")[0].trim() || "unknown";
        if (rateLimit(`credentials:${ip}:${email}`, 8, 15 * 60_000)) return null;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            banned: true,
          },
        });

        if (!user || !user.password) {
          // Benzer yanıt süresi, hesap varlığına dayalı zamanlama sızıntısını azaltır.
          await bcrypt.compare(password, "$2b$10$7EqJtq98hPqEX7fNZaFWoO5VbA6OeB8V0O8Xn2eQ7mD2NfH6X8y5a");
          return null;
        }

        // Banlı kullanıcı giriş yapamaz
        if (user.banned) return null;

        const passwordsMatch = await bcrypt.compare(
          password,
          user.password
        );

        if (!passwordsMatch) return null;

        // Son kullanılan IP'yi kaydet (gelecekteki IP banları için)
        try {
          const fwd = request?.headers?.get?.("x-forwarded-for");
          const ip = fwd ? fwd.split(",")[0].trim() : null;
          if (ip) {
            await db.user.update({ where: { id: user.id }, data: { lastIp: ip } });
          }
        } catch {
          // IP kaydı giriş akışını bozmamalı
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      }
    })
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== "google") return true;

      const currentSettings = await getGoogleAuthSettings();
      return Boolean(currentSettings.enabled && currentSettings.clientId && currentSettings.clientSecret);
    },
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.role && session.user) {
        session.user.role = token.role as Role;
      }

      return session;
    },
    async jwt({ token }) {
      if (!token.sub) return token;

      const existingUser = await db.user.findUnique({
        where: { id: token.sub },
        select: { role: true, banned: true },
      });

      if (!existingUser) return token;

      // Banlı kullanıcının oturumunu geçersiz kıl (sub'ı kaldır → session boş döner)
      if (existingUser.banned) {
        delete token.sub;
        return token;
      }

      token.role = existingUser.role;

      return token;
    }
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;

      try {
        let initialRef: string | null = null;
        try {
          const cookieStore = await cookies();
          const refCookie = cookieStore.get("_initial_referrer")?.value;
          if (refCookie) {
            initialRef = decodeURIComponent(refCookie).slice(0, 500);
          }
        } catch {
          // ignore
        }

        await db.userEvent.create({
          data: {
            type: "signup",
            userId: user.id,
            referrer: initialRef || "google_oauth",
            landingPage: "/login",
            meta: { provider: "google" },
          },
        });
      } catch {
        // Analytics hatasi auth akisini bozmamali.
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
});
