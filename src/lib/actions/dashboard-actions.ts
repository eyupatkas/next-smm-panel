"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateAiTicketResponse } from "@/lib/services/ticket-ai";
import { applyUserMoneyDelta } from "@/lib/money";

export type DashboardActionState = {
  success?: string;
  error?: string;
};

async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user.id;
}

export async function updateProfile(
  formData: FormData
): Promise<DashboardActionState> {
  const userId = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim();

  if (!name || !username) {
    return { error: "Ad soyad ve kullanici adi zorunludur." };
  }

  const existingUsername = await db.user.findFirst({
    where: {
      username,
      NOT: { id: userId },
    },
    select: { id: true },
  });

  if (existingUsername) {
    return { error: "Bu kullanici adi zaten kullanimda." };
  }

  await db.user.update({
    where: { id: userId },
    data: { name, username },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  return { success: "Hesap bilgileriniz guncellendi." };
}

export async function changePassword(
  formData: FormData
): Promise<DashboardActionState> {
  const userId = await requireUser();
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Tum sifre alanlarini doldurun." };
  }

  if (newPassword.length < 8) {
    return { error: "Yeni sifre en az 8 karakter olmalidir." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Yeni sifreler eslesmiyor." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user?.password) {
    return { error: "Sifre degistirilemiyor." };
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.password);

  if (!passwordMatch) {
    return { error: "Mevcut sifre hatali." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  revalidatePath("/dashboard/settings");

  return { success: "Sifreniz guncellendi." };
}

export async function regenerateApiKey(): Promise<DashboardActionState> {
  const userId = await requireUser();

  await db.user.update({
    where: { id: userId },
    data: { apiKey: crypto.randomUUID() },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/api-docs");

  return { success: "API anahtari yenilendi." };
}

export async function createTicket(
  formData: FormData
): Promise<DashboardActionState> {
  const userId = await requireUser();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const orderIdRaw = String(formData.get("orderId") || "").trim();

  if (!subject || !message) {
    return { error: "Konu ve mesaj zorunludur." };
  }

  // orderId doğrula (varsa, kullanıcıya ait ve var olmalı)
  let orderId: string | null = null;
  if (orderIdRaw) {
    const order = await db.order.findFirst({
      where: { id: orderIdRaw, userId },
      select: { id: true },
    });
    if (!order) {
      return { error: "Belirtilen sipariş bulunamadı veya size ait değil." };
    }
    orderId = order.id;
  }

  const openTicketCount = await db.ticket.count({
    where: { userId, status: { not: "CLOSED" } },
  });

  if (openTicketCount >= 5) {
    return { error: "Ayni anda en fazla 5 acik talep olusturabilirsiniz." };
  }

  const newTicket = await db.ticket.create({
    data: {
      userId,
      subject,
      status: "OPEN",
      orderId,
      messages: {
        create: {
          message,
          isAdmin: false,
        },
      },
    },
  });

  // Arka planda otonom AI ilk yanıtını tetikle
  generateAiTicketResponse(newTicket.id).catch(console.error);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tickets");

  return { success: "Destek talebiniz olusturuldu." };
}

export async function replyTicket(
  formData: FormData
): Promise<DashboardActionState> {
  const userId = await requireUser();
  const ticketId = String(formData.get("ticketId") || "");
  const message = String(formData.get("message") || "").trim();

  if (!ticketId || !message) {
    return { error: "Mesaj bos birakilamaz." };
  }

  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, userId },
    select: { id: true, status: true },
  });

  if (!ticket) {
    return { error: "Talep bulunamadi." };
  }

  if (ticket.status === "CLOSED") {
    return { error: "Kapali talebe yanit eklenemez." };
  }

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "OPEN",
      messages: {
        create: {
          message,
          isAdmin: false,
        },
      },
    },
  });

  revalidatePath("/dashboard/tickets");
  revalidatePath(`/dashboard/tickets/${ticket.id}`);

  return { success: "Mesajiniz iletildi." };
}

export async function closeTicket(ticketId: string): Promise<void> {
  const userId = await requireUser();

  await db.ticket.updateMany({
    where: { id: ticketId, userId },
    data: { status: "CLOSED" },
  });

  revalidatePath("/dashboard/tickets");
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function createPaymentRequest(
  formData: FormData
): Promise<DashboardActionState> {
  const userId = await requireUser();
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") || "").trim().toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Gecerli bir tutar girin." };
  }

  if (amount < 50) {
    return { error: "Minimum yukleme tutari 50 TL'dir." };
  }

  if (!["PAYTR", "SHOPIER"].includes(method)) {
    return { error: "Gecerli bir odeme yontemi secin." };
  }

  await db.payment.create({
    data: {
      userId,
      amount,
      method,
      status: "PENDING",
      externalId: `REQ-${Date.now()}`,
    },
  });

  revalidatePath("/dashboard/add-funds");

  return { success: "Odeme talebiniz kaydedildi. Onay sonrasi bakiye hesabiniza yansitilacaktir." };
}

export async function requestPasswordReset(
  formData: FormData
): Promise<DashboardActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    return { error: "E-posta adresi zorunludur." };
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { success: "Eger bu e-posta sistemde kayitliysa sifre sifirlama talebiniz alindi." };
  }

  return {
    success:
      "Mail servisi henuz bagli degil. Talebiniz kayda alindi; simdilik yonetici uzerinden sifre sifirlama uygulanmalidir.",
  };
}

// ─── Reseller: Müşteri Yönetimi ─────────────────────────────────────────

async function requireReseller() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || (user.role !== "RESELLER" && user.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

export async function addResellerCustomer(
  formData: FormData,
): Promise<DashboardActionState> {
  const resellerId = await requireReseller();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !name || !password) {
    return { error: "Tüm alanları doldurun." };
  }
  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return { error: "Bu e-posta adresi zaten kayıtlı." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: "USER",
      parentId: resellerId,
      balance: 0,
    },
  });

  revalidatePath("/dashboard/reseller/customers");
  return { success: "Müşteri başarıyla eklendi." };
}

export async function addFundsToCustomer(
  formData: FormData,
): Promise<DashboardActionState> {
  const resellerId = await requireReseller();
  const customerId = String(formData.get("customerId") || "").trim();
  const amount = Number(formData.get("amount"));

  if (!customerId || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Geçerli bir müşteri ve tutar girin." };
  }

  // Verify customer belongs to this reseller
  const customer = await db.user.findFirst({
    where: { id: customerId, parentId: resellerId },
    select: { id: true, balance: true },
  });
  if (!customer) {
    return { error: "Müşteri bulunamadı." };
  }

  // Reseller satırını kilitle; paralel transferler bakiyeyi negatife düşüremez.
  const transferred = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ balance: number }>>`
      SELECT balance FROM "User" WHERE id = ${resellerId} FOR UPDATE
    `;
    const reseller = rows[0];
    if (!reseller || Number(reseller.balance) < amount) return false;

    await applyUserMoneyDelta(tx, resellerId, { balance: -amount });
    await applyUserMoneyDelta(tx, customerId, { balance: amount });
    return true;
  });

  if (!transferred) return { error: "Yetersiz bakiye." };

  revalidatePath("/dashboard/reseller/customers");
  revalidatePath("/dashboard");
  return { success: `₺${amount.toFixed(2)} müşteri hesabına aktarıldı.` };
}

export async function updateResellerCustomer(
  formData: FormData,
): Promise<DashboardActionState> {
  const resellerId = await requireReseller();
  const customerId = String(formData.get("customerId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const newPassword = String(formData.get("newPassword") || "");

  if (!customerId || !name) {
    return { error: "Müşteri adı zorunludur." };
  }

  const customer = await db.user.findFirst({
    where: { id: customerId, parentId: resellerId },
    select: { id: true },
  });
  if (!customer) {
    return { error: "Müşteri bulunamadı." };
  }

  const updateData: { name: string; password?: string } = { name };
  if (newPassword && newPassword.length >= 6) {
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  await db.user.update({ where: { id: customerId }, data: updateData });

  revalidatePath("/dashboard/reseller/customers");
  return { success: "Müşteri bilgileri güncellendi." };
}
