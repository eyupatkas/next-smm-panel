import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Kullanıcının referans bilgilerini çek
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        // @ts-ignore
        referralCode: true,
        // @ts-ignore
        referralBalance: true,
        // @ts-ignore
        referredClicks: true,
      }
    }) as any;

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Eğer referans kodu yoksa (Self-healing) anında üret ve kaydet
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await db.user.update({
        where: { id: userId },
        data: {
          // @ts-ignore
          referralCode
        }
      });
    }

    // Davet edilen üyelerin toplam sayısı ve listesi
    // @ts-ignore
    const referredUsers = await db.user.findMany({
      where: { 
        // @ts-ignore
        referredById: userId 
      },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });

    // Referans kazanç geçmişi
    // @ts-ignore
    const transactions = await (db as any).referralTransaction.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        amount: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    // Toplam kazanılan referans tutarı
    const totalEarned = transactions.reduce((acc: number, t: any) => acc + t.amount, 0);

    return NextResponse.json({
      referralCode: referralCode || "",
      referralBalance: user.referralBalance || 0,
      referredClicks: user.referredClicks || 0,
      referredCount: referredUsers.length,
      referredUsers: referredUsers.map((u: any) => ({
        id: u.id,
        name: u.name || u.username || "Gizli Üye",
        createdAt: u.createdAt,
      })),
      transactions: transactions.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        description: t.description,
        createdAt: t.createdAt,
      })),
      totalEarned
    });

  } catch (error) {
    console.error("[referrals-get] Error:", error);
    return NextResponse.json({ error: "Referans verileri yüklenemedi." }, { status: 500 });
  }
}
