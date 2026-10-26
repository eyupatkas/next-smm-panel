"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function markNotificationRead(notificationId: string) {
  const userId = await requireAuth();
  await db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead() {
  const userId = await requireAuth();
  await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard");
}

export async function getUserNotifications(limit = 15) {
  const userId = await requireAuth();
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      read: true,
      link: true,
      createdAt: true,
    },
  });
}

/** Create a notification for a user (admin/system use) */
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");
  return db.notification.create({ data });
}
