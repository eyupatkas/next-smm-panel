import { runAutonomousFraudAgent } from "./fraud-agent";
import { runAutonomousServiceAgent } from "./service-agent";
import { runAutonomousSupportAgent } from "./support-agent";
import { runAutonomousSeoAgent } from "./seo-agent";
import { runAutonomousTranslationAgent } from "./translation-agent";

export type AutonomousAgentRunResult = {
  success: boolean;
  timestamp: string;
  agents: {
    fraud: { success: boolean; message: string; logs: string[] };
    service: { success: boolean; message: string; logs: string[] };
    support: { success: boolean; message: string; logs: string[] };
    seo: { success: boolean; message: string; logs: string[] };
    translation: { success: boolean; message: string; logs: string[] };
  };
  summaryLogs: string[];
};

/**
 * Tüm otonom alt ajanları ardışık ve güvenli bir şekilde çalıştıran merkezi Ajan Yöneticisi.
 */
export async function executeAutonomousAgentSystem(): Promise<AutonomousAgentRunResult> {
  const summaryLogs: string[] = [];
  summaryLogs.push(`[Agent Manager] Otonom SMM Ajan Sistemi Başlatıldı. Zaman: ${new Date().toISOString()}`);

  // 1. Güvenlik ve Anomali Ajanı (Fraud Agent)
  summaryLogs.push("[Agent Manager] 1/5: Güvenlik Ajanı çalıştırılıyor...");
  const fraudRes = await runAutonomousFraudAgent();
  summaryLogs.push(`[Agent Manager] Güvenlik Ajanı Sonucu: ${fraudRes.message}`);

  // 2. Tedarikçi/Hizmet Ajanı (Service Agent)
  summaryLogs.push("[Agent Manager] 2/5: Tedarikçi Ajanı çalıştırılıyor...");
  const serviceRes = await runAutonomousServiceAgent();
  summaryLogs.push(`[Agent Manager] Tedarikçi Ajanı Sonucu: ${serviceRes.message}`);

  // 3. Müşteri Destek Ajanı (Support Agent)
  summaryLogs.push("[Agent Manager] 3/5: Destek Ajanı çalıştırılıyor...");
  const supportRes = await runAutonomousSupportAgent();
  summaryLogs.push(`[Agent Manager] Destek Ajanı Sonucu: ${supportRes.message}`);

  // 4. SEO ve Blog İçerik Ajanı (SEO Agent)
  summaryLogs.push("[Agent Manager] 4/5: SEO Ajanı çalıştırılıyor...");
  const seoRes = await runAutonomousSeoAgent();
  summaryLogs.push(`[Agent Manager] SEO Ajanı Sonucu: ${seoRes.message}`);

  // 5. Çoklu Dil Çeviri Ajanı (Translation Agent)
  summaryLogs.push("[Agent Manager] 5/5: Çeviri Ajanı çalıştırılıyor...");
  const translationRes = await runAutonomousTranslationAgent();
  summaryLogs.push(`[Agent Manager] Çeviri Ajanı Sonucu: ${translationRes.message}`);

  summaryLogs.push(`[Agent Manager] Otonom SMM Ajan Sistemi Çalışması Tamamlandı. Zaman: ${new Date().toISOString()}`);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    agents: {
      fraud: { success: fraudRes.success, message: fraudRes.message, logs: fraudRes.logs },
      service: { success: serviceRes.success, message: serviceRes.message, logs: serviceRes.logs },
      support: { success: supportRes.success, message: supportRes.message, logs: supportRes.logs },
      seo: { success: seoRes.success, message: seoRes.message, logs: seoRes.logs },
      translation: { success: translationRes.success, message: translationRes.message, logs: translationRes.logs },
    },
    summaryLogs,
  };
}
