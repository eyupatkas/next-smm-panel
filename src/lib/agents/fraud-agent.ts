import { db } from "@/lib/db";

export type FraudAgentResult = {
  success: boolean;
  message: string;
  flaggedUsers: string[];
  logs: string[];
};

/**
 * Otonom Güvenlik ve Anomali Ajanı.
 * Kredi kartı fraud/ters ibraz risklerini önlemek için şüpheli işlemleri ve
 * anormal hızlı bakiye yüklemelerini denetler. Riskli hesapları otonom askıya alır.
 */
export async function runAutonomousFraudAgent(): Promise<FraudAgentResult> {
  const logs: string[] = [];
  const flaggedUsers: string[] = [];

  try {
    // 1. Son 2 saatteki başarılı yüklemeleri çek
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    const recentPayments = await db.payment.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: twoHoursAgo },
      },
      include: {
        user: true,
      },
    });

    // 2. Kullanıcı bazında ödemeleri grupla
    const paymentsByUser = new Map<string, typeof recentPayments>();
    for (const p of recentPayments) {
      if (!paymentsByUser.has(p.userId)) {
        paymentsByUser.set(p.userId, []);
      }
      paymentsByUser.get(p.userId)!.push(p);
    }

    // 3. Anomali tespiti
    for (const [userId, userPayments] of paymentsByUser.entries()) {
      const user = userPayments[0].user;
      
      // Adminler denetim dışı kalsın
      if (user.role === "ADMIN") continue;
      if (user.banned) continue; // Zaten askıdaysa atla

      const totalAmount = userPayments.reduce((sum, p) => sum + p.amount, 0);
      const paymentCount = userPayments.length;

      let isSuspicious = false;
      let reason = "";

      // Koşul A: Son 2 saatte 3'ten fazla başarılı yükleme yapılmışsa
      if (paymentCount >= 3) {
        isSuspicious = true;
        reason = `Son 2 saat içinde ${paymentCount} adet başarılı bakiye yükleme işlemi gerçekleştirildi.`;
      }
      // Koşul B: Son 2 saatteki toplam yükleme standart bir kullanıcı için 5.000 TRY üzerindeyse
      else if (totalAmount >= 5000 && user.role === "USER") {
        isSuspicious = true;
        reason = `Son 2 saat içinde toplam ₺${totalAmount.toFixed(2)} tutarında yüksek bakiye yüklemesi yapıldı.`;
      }
      // Koşul C: Tek seferde 10.000 TRY üzerinde yükleme
      else {
        const hasHugeSinglePayment = userPayments.some((p) => p.amount >= 10000);
        if (hasHugeSinglePayment) {
          isSuspicious = true;
          reason = `Tek seferde ₺10.000 ve üzeri anormal yüksek bakiye yüklemesi yapıldı.`;
        }
      }

      if (isSuspicious) {
        logs.push(`[Fraud Agent] Şüpheli aktivite saptandı: User "${user.email}" (ID: ${user.id})`);
        
        // Kullanıcıyı askıya al (banned = true)
        await db.user.update({
          where: { id: user.id },
          data: {
            banned: true,
            bannedAt: new Date(),
            banReason: reason,
          },
        });

        // Tüm adminlere sistem uyarısı olarak notification oluştur
        const admins = await db.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        });

        for (const admin of admins) {
          await db.notification.create({
            data: {
              userId: admin.id,
              type: "SYSTEM_ALERT",
              title: "ACİL: Şüpheli Hesap Askıya Alındı",
              message: `"${user.email}" kullanıcısı şüpheli bakiye anomalisi nedeniyle otonom güvenlik ajanı tarafından askıya alındı. Gerekçe: ${reason}`,
            },
          });
        }

        flaggedUsers.push(user.id);
        logs.push(`  ✓ BAŞARILI: "${user.email}" hesabı otonom olarak donduruldu. Adminler bilgilendirildi.`);
      }
    }

    return {
      success: true,
      message: `Güvenlik Ajanı tamamlandı. ${flaggedUsers.length} riskli hesap donduruldu.`,
      flaggedUsers,
      logs,
    };
  } catch (error) {
    console.error("[Fraud Agent Error]:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Güvenlik Ajanı hatası.",
      flaggedUsers,
      logs: [...logs, `HATA: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
