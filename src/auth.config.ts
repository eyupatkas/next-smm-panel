import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Middleware uyumluluğu için bu dosya veritabanı veya bcryptjs içermemelidir.
export default {
  providers: [
    Credentials({
      // authorize fonksiyonu auth.ts içinde ezilecektir (veritabanı erişimi için)
      async authorize() {
        return null;
      }
    })
  ],
} satisfies NextAuthConfig;
