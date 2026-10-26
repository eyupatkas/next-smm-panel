import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { applyQuestProgress } from "@/lib/quest-progress";
import { applyUserMoneyDelta, roundMoney } from "@/lib/money";

// Günlük görev tanımları
const QUEST_TEMPLATES = [
  {
    title: "Günlük Giriş Ödülü",
    description: "Bugün OptiSMM paneline giriş yap ve ödülünü al.",
    rewardXp: 10,
    rewardCoin: 0.10,
  },
  {
    title: "Servisleri Keşfet",
    description: "Servis listesi sayfasını ziyaret et ve fiyatları incele.",
    rewardXp: 15,
    rewardCoin: 0.20,
  },
  {
    title: "İlk Sipariş Hareketi",
    description: "Herhangi bir sosyal medya servisinden ilk siparişini ver.",
    rewardXp: 40,
    rewardCoin: 1.50,
  }
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Aynı anda açılan iki sekmenin aynı günlük görevleri iki kez üretmesini önle.
    const userQuests = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      let quests = await tx.userQuest.findMany({
        where: {
          userId,
          createdAt: {
            gte: today
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      if (quests.length === 0) {
        await tx.userQuest.createMany({
          data: QUEST_TEMPLATES.map((q) => ({
            userId,
            title: q.title,
            description: q.description,
            rewardXp: q.rewardXp,
            rewardCoin: q.rewardCoin,
            completed: false,
            createdAt: new Date(),
          })),
        });
        quests = await tx.userQuest.findMany({
          where: { userId, createdAt: { gte: today } },
          orderBy: { createdAt: "asc" },
        });
      }

      return quests;
    });

    // Kullanıcının genel XP, Level ve QuestCoins (bakiye) durumunu çek
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, questCoins: true, balance: true }
    });

    return NextResponse.json({
      success: true,
      quests: userQuests,
      userStats: user
    });

  } catch (error) {
    console.error("[quests-api-get] Error:", error);
    return NextResponse.json({ error: "Görevler yüklenirken bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const { questId } = body;

    if (!questId) {
      return NextResponse.json({ error: "Geçersiz görev ID." }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const quest = await tx.userQuest.findFirst({ where: { id: questId, userId } });
      if (!quest) return { error: "Görev bulunamadı.", status: 404 as const };
      if (quest.completed) return { error: "Bu görev zaten tamamlanmış.", status: 400 as const };

      if (quest.title.includes("Sipariş")) {
        const orderCount = await tx.order.count({ where: { userId } });
        if (orderCount === 0) {
          return { error: "Henüz hiç sipariş vermediniz. Lütfen önce bir sipariş oluşturun.", status: 400 as const };
        }
      }

      const claimed = await tx.userQuest.updateMany({
        where: { id: quest.id, userId, completed: false },
        data: { completed: true, completedAt: new Date() },
      });
      if (claimed.count !== 1) return { error: "Bu görev zaten tamamlanmış.", status: 400 as const };

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true },
      });
      if (!user) return { error: "Kullanıcı bulunamadı.", status: 404 as const };

      const progress = applyQuestProgress(user.xp, user.level, quest.rewardXp);
      await tx.user.update({
        where: { id: userId },
        data: {
          xp: progress.xp,
          level: progress.level,
          questCoins: { increment: roundMoney(quest.rewardCoin) },
        },
      });
      await applyUserMoneyDelta(tx, userId, { balance: quest.rewardCoin });

      const updatedQuest = await tx.userQuest.findUniqueOrThrow({ where: { id: quest.id } });
      return { quest, updatedQuest, ...progress };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: "Görev başarıyla tamamlandı! Ödüller hesabınıza eklendi.",
      leveledUp: result.leveledUp,
      newLevel: result.level,
      xpGained: result.quest.rewardXp,
      coinGained: result.quest.rewardCoin,
      quest: result.updatedQuest
    });

  } catch (error) {
    console.error("[quests-api-post] Error:", error);
    return NextResponse.json({ error: "Görev tamamlanırken bir hata oluştu." }, { status: 500 });
  }
}
