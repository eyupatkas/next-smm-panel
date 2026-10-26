import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createBulkUserNotifications } from "@/lib/services/notifications";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Kullanıcının referans bakiyesini sorgula
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
        // @ts-ignore
        referralBalance: true,
      }
    }) as any;

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const amountToConvert = Number(user.referralBalance || 0);

    if (amountToConvert <= 0) {
      return NextResponse.json({ error: "Dönüştürülecek referans bakiyeniz bulunmamaktadır." }, { status: 400 });
    }

    // Bakiyeleri güncelle
    await db.$transaction([
      // Bakiye artışı ROUND+clamp güvencesiyle uygulanır
      db.$executeRaw`UPDATE "User" SET balance = GREATEST(ROUND((COALESCE(balance, 0) + ${amountToConvert}::double precision)::numeric, 4), 0)::double precision WHERE id = ${userId}`,
      db.user.update({
        where: { id: userId },
        data: {
          // @ts-ignore
          referralBalance: 0.0
        }
      }),
      // Log için bir notification oluştur
      db.notification.create({
        data: {
          userId,
          type: "BALANCE",
          title: "Referans bakiyesi aktarıldı!",
          message: `₺${amountToConvert.toFixed(2)} referans komisyon bakiyeniz ana bakiyenize başarıyla dönüştürüldü.`,
          link: "/dashboard/add-funds",
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      convertedAmount: amountToConvert
    });

  } catch (error) {
    console.error("[referrals-convert-post] Error:", error);
    return NextResponse.json({ error: "Bakiye dönüştürme işlemi başarısız oldu." }, { status: 500 });
  }
}
