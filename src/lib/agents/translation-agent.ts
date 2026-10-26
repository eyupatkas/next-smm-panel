import { autoTranslateMissingDatabaseContents } from "../services/auto-translate";

export async function runAutonomousTranslationAgent() {
  const logs: string[] = [];
  logs.push("[Translation Agent] Otonom Çeviri Ajanı Uyandırıldı.");
  
  try {
    logs.push("[Translation Agent] Veritabanındaki eksik çeviriler analiz ediliyor...");
    await autoTranslateMissingDatabaseContents();
    logs.push("[Translation Agent] Çevirisi olmayan veritabanı öğelerinin çevirisi başarıyla tetiklendi ve tamamlandı.");
    
    return {
      success: true,
      message: "Veritabanı çevirileri otonom olarak güncellendi.",
      logs,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Bilinmeyen hata";
    logs.push(`[Translation Agent] HATA: ${errMsg}`);
    return {
      success: false,
      message: `Çeviri hatası: ${errMsg}`,
      logs,
    };
  }
}
