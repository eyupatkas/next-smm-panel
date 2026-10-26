import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET: Kullanıcının kurtarılmaya hazır en son terk edilmiş işlemini çeker
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Son 1 saat içindeki kurtarılmamış terk edilmiş işlemi bul
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const abandoned = await db.abandonedProcess.findFirst({
      where: {
        userId,
        recovered: false,
        createdAt: {
          gte: oneHourAgo
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!abandoned) {
      return NextResponse.json({ active: false });
    }

    // Eğer henüz kupon atanmamışsa, rastgele bir kupon kodu oluştur ve ata
    let couponCode = abandoned.couponCode;
    if (!couponCode) {
      couponCode = `RECOVER${Math.floor(10 + Math.random() * 90)}`;
      await db.abandonedProcess.update({
        where: { id: abandoned.id },
        data: { couponCode }
      });
    }

    return NextResponse.json({
      active: true,
      id: abandoned.id,
      pageType: abandoned.pageType,
      formData: abandoned.formData,
      couponCode
    });

  } catch (error) {
    console.error("[recovery-track-get] Error:", error);
    return NextResponse.json({ error: "Kurtarma verileri yüklenemedi." }, { status: 500 });
  }
}

// POST: Kullanıcının form doldururken terk ettiğini kaydeder
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const pageType = typeof body.pageType === "string" ? body.pageType : "";
    const formData = body.formData;

    if (!["ORDER", "FUNDS"].includes(pageType) || !formData || typeof formData !== "object" || Array.isArray(formData)) {
      return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
    }
    if (JSON.stringify(formData).length > 10_000) {
      return NextResponse.json({ error: "Form verisi çok büyük." }, { status: 413 });
    }

    // Son 15 dakika içinde zaten bir terk edilmiş işlem varsa güncelle, yoksa yeni oluştur
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const existing = await db.abandonedProcess.findFirst({
      where: {
        userId,
        pageType,
        recovered: false,
        createdAt: {
          gte: fifteenMinutesAgo
        }
      }
    });

    let process;
    if (existing) {
      process = await db.abandonedProcess.update({
        where: { id: existing.id },
        data: {
          formData: formData as Prisma.InputJsonValue,
          updatedAt: new Date()
        }
      });
    } else {
      process = await db.abandonedProcess.create({
        data: {
          userId,
          pageType,
          formData: formData as Prisma.InputJsonValue,
          recovered: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      id: process.id
    });

  } catch (error) {
    console.error("[recovery-track-post] Error:", error);
    return NextResponse.json({ error: "Terk etme eylemi kaydedilemedi." }, { status: 500 });
  }
}

// PUT: Terk edilmiş işlemin başarıyla kurtarıldığını (recovered = true) işaretler
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "Geçersiz ID." }, { status: 400 });
    }

    const updated = await db.abandonedProcess.updateMany({
      where: { id, userId: session.user.id },
      data: {
        recovered: true,
        updatedAt: new Date()
      }
    });

    if (updated.count !== 1) {
      return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[recovery-track-put] Error:", error);
    return NextResponse.json({ error: "Kurtarma durumu güncellenemedi." }, { status: 500 });
  }
}
