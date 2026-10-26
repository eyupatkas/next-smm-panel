import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";
import { roundMoney } from "@/lib/money";

// GET /api/admin/users/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      balance: true,
      spent: true,
      questCoins: true,
      referralBalance: true,
      parentId: true,
      apiKey: true,
      createdAt: true,
      updatedAt: true,
      parent: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          orders: true,
          payments: true,
          tickets: true,
          customers: true,
          quests: true,
        },
      },
      orders: {
        select: {
          id: true,
          status: true,
          charge: true,
          createdAt: true,
          service: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/admin/users/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();

  // Prevent admin from removing their own admin role
  if (session!.user!.id === id && body.role && body.role !== "ADMIN") {
    return NextResponse.json({ error: "Kendi admin rolünüzü değiştiremezsiniz." }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  let balanceDelta: number | null = null;

  if (body.name !== undefined) updateData.name = String(body.name).trim() || null;
  if (body.email !== undefined) updateData.email = String(body.email).trim() || null;
  if (body.username !== undefined) updateData.username = String(body.username).trim() || null;
  if (body.phone !== undefined) updateData.phone = String(body.phone).trim() || null;
  if (body.role !== undefined && ["ADMIN", "USER", "RESELLER"].includes(body.role)) {
    updateData.role = body.role as Role;
  }
  if (body.parentId !== undefined) {
    updateData.parentId = body.parentId === "" || body.parentId === null ? null : String(body.parentId);
  }

  // Balance add/set
  if (body.balanceDelta !== undefined) {
    const delta = Number(body.balanceDelta);
    if (Number.isFinite(delta) && Math.abs(delta) <= 1_000_000) balanceDelta = delta;
  } else if (body.balance !== undefined) {
    const bal = Number(body.balance);
    if (Number.isFinite(bal) && bal >= 0 && bal <= 100_000_000) updateData.balance = bal;
  }

  if (Object.keys(updateData).length === 0 && balanceDelta === null) {
    return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      if (balanceDelta !== null) {
        const rows = await tx.$queryRaw<Array<{ balance: number }>>`
          SELECT balance FROM "User" WHERE id = ${id} FOR UPDATE
        `;
        if (!rows[0]) throw new Error("USER_NOT_FOUND");
        updateData.balance = roundMoney(Math.max(0, Number(rows[0].balance) + balanceDelta));
      }

      return tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          balance: true,
          spent: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Güncelleme başarısız." }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const { id } = await params;

  // Prevent self-deletion
  if (session!.user!.id === id) {
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz." }, { status: 400 });
  }

  // Prevent deleting other admins
  const target = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Admin hesabı silinemez." }, { status: 400 });
  }

  try {
    // Cascade delete — Order/Payment/Ticket'in onDelete: Cascade tanımı yok,
    // bu yüzden transaction içinde doğru sırada manuel siliyoruz.
    await db.$transaction(async (tx) => {
      // 1. Bu kullanıcının müşterilerinin parentId bağını kes
      await tx.user.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      });

      // 2. Bu kullanıcıya ait ticket mesajlarını sil
      const userTicketIds = await tx.ticket.findMany({
        where: { userId: id },
        select: { id: true },
      });
      if (userTicketIds.length > 0) {
        await tx.message.deleteMany({
          where: { ticketId: { in: userTicketIds.map((t) => t.id) } },
        });
      }

      // 3. Ticket sil
      await tx.ticket.deleteMany({ where: { userId: id } });

      // 4. Sipariş sil
      await tx.order.deleteMany({ where: { userId: id } });

      // 5. Ödeme sil
      await tx.payment.deleteMany({ where: { userId: id } });

      // 6. Kullanıcıyı sil (Account/Session/Notification/ResellerApplication cascade)
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Admin] Kullanıcı silme hatası:", err);
    return NextResponse.json({ error: "Silme işlemi başarısız." }, { status: 500 });
  }
}
