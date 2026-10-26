"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ResellerApplyState = {
  success?: string;
  error?: string;
};

export async function submitResellerApplication(
  _prev: ResellerApplyState,
  formData: FormData,
): Promise<ResellerApplyState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user) return { error: "Kullanıcı bulunamadı." };
  if (user.role === "RESELLER") return { error: "Zaten bayi hesabınız var." };
  if (user.role === "ADMIN") return { error: "Admin hesapları için bayi başvurusu yapılamaz." };

  // Check for existing pending application
  const existing = await db.resellerApplication.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    select: { id: true },
  });
  if (existing) return { error: "Zaten bekleyen bir başvurunuz var." };

  const company = String(formData.get("company") || "").trim();
  const website = String(formData.get("website") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!message) return { error: "Lütfen başvuru mesajınızı yazın." };

  await db.resellerApplication.create({
    data: {
      userId: session.user.id,
      company: company || null,
      website: website || null,
      message,
    },
  });

  revalidatePath("/dashboard/reseller/apply");
  return { success: "Başvurunuz alındı. En kısa sürede değerlendirilecektir." };
}
