"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "admin_impersonate";
const COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

/** Start impersonating a user. Admin-only. */
export async function startImpersonation(userId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Verify target user exists and is not an admin
  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!targetUser) throw new Error("Kullanıcı bulunamadı");
  if (targetUser.role === "ADMIN") throw new Error("Admin kullanıcıları taklit edilemez");

  const jar = await cookies();
  jar.set(COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  redirect("/dashboard");
}

/** Stop impersonating and return to admin panel. */
export async function stopImpersonation(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  revalidatePath("/admin");
  redirect("/admin");
}

/** Search users by name or email (admin only). */
export async function searchUsers(query: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  if (!query || query.trim().length < 2) return [];

  return db.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
      NOT: { role: "ADMIN" },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      balance: true,
    },
    take: 8,
    orderBy: { createdAt: "desc" },
  });
}
