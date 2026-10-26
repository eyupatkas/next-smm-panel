import { db } from "@/lib/db";
import { cancelProviderOrders, getProviderOrderStatus } from "@/lib/api/provider-client";
import { applyUserMoneyDelta } from "@/lib/money";
import { runToolLoop } from "./agent-loop";
import { SUPPORT_TOOLS, createSupportToolExecutor } from "./support-tools";
import { buildTicketContext, buildCatalogSnapshot, formatTicketContextAsText } from "@/lib/services/support-context";

export type SupportAgentResult = {
  success: boolean;
  message: string;
  processedTickets: string[];
  logs: string[];
};

/**
 * Otonom Destek/Bilet Ajanı.
 * Kullanıcı biletlerini analiz eder, basit mesajları kural tabanlı yanıtlar,
 * takılmış siparişlerle ilgili biletleri sağlayıcı üzerinden otonom iptal/iade eder,
 * diğer durumlar için DeepSeek ile akıllı yanıtlar üretir.
 */
export async function runAutonomousSupportAgent(): Promise<SupportAgentResult> {
  const logs: string[] = [];
  const processedTickets: string[] = [];

  try {
    // 1. Açık veya Bekleyen biletleri çek (en son mesajlarıyla birlikte)
    const tickets = await db.ticket.findMany({
      where: {
        status: { in: ["OPEN", "PENDING"] },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            balance: true,
            spent: true,
          },
        },
        order: {
          include: {
            service: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
    });

    for (const ticket of tickets) {
      if (ticket.messages.length === 0) continue;

      const lastMessage = ticket.messages[ticket.messages.length - 1];
      
      // Eğer son mesaj zaten admin/destek ekibindense işlem yapma (müşterinin yanıtını bekliyoruz)
      if (lastMessage.isAdmin) continue;

      const userText = lastMessage.message.trim();
      const userTextLower = userText.toLowerCase();
      
      logs.push(`[Support Agent] Bilet inceleniyor: #${ticket.id.slice(-8).toUpperCase()} - Konu: "${ticket.subject}"`);

      // ───────────────────────────────────────────────────────────────────────
      // A. TOKEN TASARRUFU (ÖN FİLTRELEME): Basit/Genel mesajlara kural tabanlı yanıt
      // ───────────────────────────────────────────────────────────────────────
      const genericGreetingRegex = /^(merhaba|selam|selamlar|slm|mrb|hi|hello|test)$/i;
      if (genericGreetingRegex.test(userTextLower)) {
        await db.$transaction(async (tx) => {
          await tx.message.create({
            data: {
              ticketId: ticket.id,
              message: "Merhaba! OptiSMM Destek Sistemine hoş geldiniz. Size nasıl yardımcı olabiliriz? Sosyal medya büyütme hizmetlerimiz veya siparişleriniz hakkında sormak istediğiniz konuyu iletirseniz, otonom destek asistanımız anında çözüm üretecektir.",
              isAdmin: true,
            },
          });
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { status: "ANSWERED" },
          });
        });
        processedTickets.push(ticket.id);
        logs.push(`  ✓ Ön filtreleme ile kural tabanlı selamlaşma yanıtı gönderildi.`);
        continue;
      }

      // ───────────────────────────────────────────────────────────────────────
      // B. OTONOM SİPARİŞ İPTALİ / İADE KONTROLÜ
      // ───────────────────────────────────────────────────────────────────────
      let wasAutoRefunded = false;

      if (ticket.order && userTextLower.includes("iptal")) {
        const order = ticket.order;
        const canRequestCancel = order.service.canCancel;

        if (["COMPLETED", "PARTIAL", "REFUNDED"].includes(order.status)) {
          await db.$transaction(async (tx) => {
            await tx.message.create({
              data: {
                ticketId: ticket.id,
                message: `Merhaba, siparişiniz (#${order.id.slice(-8).toUpperCase()}) zaten tamamlanmış veya kısmen tamamlanmış durumdadır. Gönderimi biten işlemlerin iptal edilmesi veya geri alınması teknik olarak mümkün değildir.`,
                isAdmin: true,
              },
            });
            await tx.ticket.update({
              where: { id: ticket.id },
              data: { status: "ANSWERED" },
            });
          });
          wasAutoRefunded = true;
          processedTickets.push(ticket.id);
          logs.push(`  ✓ Bilgilendirme: Tamamlanan sipariş iptal edilemedi.`);
        } else if (!canRequestCancel) {
          await db.$transaction(async (tx) => {
            await tx.message.create({
              data: {
                ticketId: ticket.id,
                message: `Merhaba, siparişiniz (#${order.id.slice(-8).toUpperCase()}) için iptal talebi ilettiniz, ancak satın aldığınız servis türü (sağlayıcı kaynaklı teknik sebeplerle) iptali desteklememektedir. Sipariş kuyruğa alındığı için sistem otomatik olarak tamamlayana kadar beklemeniz gerekmektedir.`,
                isAdmin: true,
              },
            });
            await tx.ticket.update({
              where: { id: ticket.id },
              data: { status: "ANSWERED" },
            });
          });
          wasAutoRefunded = true;
          processedTickets.push(ticket.id);
          logs.push(`  ✓ Bilgilendirme: İptal desteklemeyen servis iptal edilemedi.`);
        } else if (order.apiOrderId && order.service.provider) {
          const provider = order.service.provider;
          try {
            const cancelRes = await cancelProviderOrders(provider.apiUrl, provider.apiKey, [order.apiOrderId]);
            if (cancelRes.ok && cancelRes.cancelled.includes(order.apiOrderId)) {
              const refundedAmount = order.charge;
              await db.$transaction(async (tx) => {
                const settled = await tx.order.updateMany({
                  where: {
                    id: order.id,
                    refundedAmount: null,
                    status: { in: ["PENDING", "PROCESSING"] },
                  },
                  data: {
                    status: "CANCELED",
                    cancelledAt: new Date(),
                    refundedAmount,
                  },
                });

                if (settled.count === 1 && refundedAmount > 0) {
                  await applyUserMoneyDelta(tx, ticket.userId, {
                    balance: refundedAmount,
                    spent: -refundedAmount,
                  });

                  await tx.notification.create({
                    data: {
                      userId: ticket.userId,
                      type: "ORDER_UPDATE",
                      title: "Sipariş İptal Edildi ve İade Edildi",
                      message: `Siparişiniz (#${order.id.slice(-8).toUpperCase()}) destek talebiniz üzerine iptal edildi ve ₺${refundedAmount.toFixed(2)} bakiyenize iade edildi.`,
                    },
                  });
                }

                await tx.message.create({
                  data: {
                    ticketId: ticket.id,
                    message: `Merhaba, talebiniz üzerine siparişiniz (#${order.id.slice(-8).toUpperCase()}) iptal edilmiştir. Sipariş tutarı olan ₺${refundedAmount.toFixed(2)} hesabınıza iade edilmiştir. Farklı bir hizmetimizi deneyebilir veya yeni sipariş oluşturabilirsiniz.`,
                    isAdmin: true,
                  },
                });

                await tx.ticket.update({
                  where: { id: ticket.id },
                  data: { status: "ANSWERED" },
                });
              });

              wasAutoRefunded = true;
              processedTickets.push(ticket.id);
              logs.push(`  ✓ BAŞARILI: Sipariş iptal edildi ve bakiye iade edildi.`);
            } else {
              const failReason = cancelRes.failed?.[0]?.error || "Sağlayıcı iptali onaylamadı.";
              await db.$transaction(async (tx) => {
                await tx.message.create({
                  data: {
                    ticketId: ticket.id,
                    message: `Merhaba, siparişinizin (#${order.id.slice(-8).toUpperCase()}) iptal talebi sağlayıcıya iletildi ancak şu aşamada işlem durdurulamadı. Gönderim süreci devam etmektedir. Hata detayı: ${failReason}`,
                    isAdmin: true,
                  },
                });
                await tx.ticket.update({
                  where: { id: ticket.id },
                  data: { status: "ANSWERED" },
                });
              });
              wasAutoRefunded = true;
              processedTickets.push(ticket.id);
              logs.push(`  ✓ Bilgilendirme: Sağlayıcı iptal talebini reddetti.`);
            }
          } catch (apiErr) {
            logs.push(`  • Sağlayıcı iptal hatası: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`);
          }
        }
      }

      // Genel askıda kalmış sipariş kontrolü (kullanıcı mesajında iptal geçmese de 12 saat kuralı)
      if (!wasAutoRefunded && ticket.order && ["PENDING", "PROCESSING"].includes(ticket.order.status)) {
        const order = ticket.order;
        const elapsedHours = (Date.now() - new Date(order.createdAt).getTime()) / 3_600_000;
        
        if (elapsedHours >= 12 && order.apiOrderId && order.service.provider) {
          const provider = order.service.provider;
          try {
            const statusRes = await getProviderOrderStatus({
              apiUrl: provider.apiUrl,
              apiKey: provider.apiKey,
              apiOrderId: order.apiOrderId,
            });

            const isProviderCanceled = statusRes.ok && statusRes.status === "CANCELED";
            const canRequestCancel = order.service.canCancel;

            if (isProviderCanceled) {
              const refundedAmount = order.charge;
              await db.$transaction(async (tx) => {
                const settled = await tx.order.updateMany({
                  where: {
                    id: order.id,
                    refundedAmount: null,
                    status: { in: ["PENDING", "PROCESSING"] },
                  },
                  data: {
                    status: "CANCELED",
                    cancelledAt: new Date(),
                    refundedAmount,
                  },
                });

                if (settled.count === 1 && refundedAmount > 0) {
                  await applyUserMoneyDelta(tx, ticket.userId, {
                    balance: refundedAmount,
                    spent: -refundedAmount,
                  });

                  await tx.notification.create({
                    data: {
                      userId: ticket.userId,
                      type: "ORDER_UPDATE",
                      title: "Sipariş İptal Edildi ve İade Edildi",
                      message: `Siparişiniz (#${order.id.slice(-8).toUpperCase()}) otonom sistem tarafından iptal edildi ve ₺${refundedAmount.toFixed(2)} bakiyenize iade edildi.`,
                    },
                  });
                }

                await tx.message.create({
                  data: {
                    ticketId: ticket.id,
                    message: `Merhaba, siparişiniz (#${order.id.slice(-8).toUpperCase()}) incelendi ve sağlayıcı tarafındaki gecikme nedeniyle otonom sistemimiz tarafından otomatik olarak İPTAL edildi. Sipariş tutarı olan ₺${refundedAmount.toFixed(2)} hesabınıza iade edilmiştir.`,
                    isAdmin: true,
                  },
                });

                await tx.ticket.update({
                  where: { id: ticket.id },
                  data: { status: "ANSWERED" },
                });
              });

              wasAutoRefunded = true;
              processedTickets.push(ticket.id);
            }
          } catch (apiErr) {
            logs.push(`  • Sağlayıcı askı kontrol hatası: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`);
          }
        }
      }

      if (wasAutoRefunded) continue;

      // ───────────────────────────────────────────────────────────────────────
      // C. AI GATEWAY İLE KAPSAMLI ARAŞTIRMALI YANIT ÜRETME
      // ───────────────────────────────────────────────────────────────────────
      logs.push(`  • AI ajanı ile bilet yanıtı üretiliyor (bağlam + site araştırması)...`);

      const ctx = await buildTicketContext(ticket.id);
      if (!ctx) continue;

      const catalogSnapshot = await buildCatalogSnapshot();
      const contextText = formatTicketContextAsText(ctx, catalogSnapshot);
      const customerName = ticket.user.name || "Değerli Müşterimiz";

      const systemPrompt = `Sen OptiSMM destek ekibinin otonom uzman ajanısın. Müşterinin tüm hesap bilgilerine, siparişlerine, ödemelerine ve sitenin tüm vaatlerine/kataloğuna hakimsin; gerekirse verilen araçlarla site sayfalarını tarayıp araştırma yapabilirsin.

ÖNEMLİ KURALLAR:
1. Türkçe yaz; sıcak, kibar, profesyonel ve çözüm odaklı ol. "Merhaba ${customerName}", "Sayın Müşterimiz" gibi yapay kalıp hitaplar kullanma; girişi doğal yap.
2. Müşterinin gerçek verilerini (sipariş durumu, bakiye, ödeme geçmişi) kullanarak somut yanıt ver.
3. OptiSMM tüm hizmetlerin doğrudan ve tek sağlayıcısıdır; "aracı", "bayi", "tedarikçi", "alt sağlayıcı" ifadelerini KESİNLİKLE kullanma. İç işlem durum kodlarından ve teknik iç detaylardan bahsetme.
4. Sipariş devam ediyorsa yoğunluğa göre işlem sırasına alındığını, başlangıcın 0-24 saat sürebildiğini belirtip sabır iste.
5. Emin olmadığın bilgiyi (kampanya, politika, fiyat) asla uydurma; browse_page_content ile ilgili sayfayı oku ya da ekibin inceleyeceğini söyle.
6. Yanıtını kısa ve net tut (en fazla 2-3 paragraf); markdown kod bloğu kullanma.
7. Yanıtın sonuna şu notu ekle: "Not: Bu yanıt sorununuzu çözmediyse lütfen mesaj yazmaya devam edin; müşteri temsilcilerimiz talebinizi en kısa sürede inceleyecektir."`;

      const userPrompt = `Aşağıdaki destek talebini incele ve son müşteri mesajını yanıtla. Gerekirse araçlarla araştırma yap.

${contextText}

Yalnızca yanıt metnini yaz.`;

      const aiRes = await runToolLoop({
        systemPrompt,
        userPrompt,
        tools: SUPPORT_TOOLS,
        executeTool: createSupportToolExecutor(ticket.userId),
        maxIterations: 4,
        temperature: 0.5,
        maxTokens: 1400,
      });

      if (aiRes.ok && aiRes.reply) {
        await db.$transaction(async (tx) => {
          await tx.message.create({
            data: {
              ticketId: ticket.id,
              message: aiRes.reply,
              isAdmin: true,
            },
          });

          await tx.ticket.update({
            where: { id: ticket.id },
            data: { status: "ANSWERED" },
          });
        });

        processedTickets.push(ticket.id);
        logs.push(`  ✓ BAŞARILI: AI yanıtı gönderildi (${aiRes.provider}/${aiRes.model}).`);
      } else {
        logs.push(`  • AI yanıtı üretilemedi: ${aiRes.error || "Bilinmeyen hata"}`);
      }
    }

    return {
      success: true,
      message: `Destek Ajanı tamamlandı. ${processedTickets.length} bilet yanıtlandı.`,
      processedTickets,
      logs,
    };
  } catch (error) {
    console.error("[Support Agent Error]:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Destek Ajanı hatası.",
      processedTickets,
      logs: [...logs, `HATA: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
