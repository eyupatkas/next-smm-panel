/**
 * Servis adından müşteriye gösterilecek dinamik bilgiler çıkarılır:
 * hız (ör. "Saatte 500", "Günde 10K"), Türk hedefi, garantinin olup olmadığı.
 * Metinler servis verisinden türetildiği için vaatler daima gerçekle uyumlu olur.
 */

/** Servis adındaki hız ifadelerini bulur → "Saatte 500", "Günde 10K", "Anlık" */
export function extractSpeedLabel(serviceName: string): string | null {
  if (!serviceName) return null;

  const patterns: RegExp[] = [
    /(saatte\s?[\d.,]+[km]?)/i,
    /(günde\s?[\d.,]+[km]?)/i,
    /(0-?\d+\s?(dakikada|saatte)\s?başlar)/i,
    /(an(lık|da)\s?başlar)/i,
    /(hızlı\s?başlar)/i,
    /(\([\d.]+k?\/day\))/i,
    /([\d.]+k?\/day)/i,
  ];

  for (const re of patterns) {
    const m = serviceName.match(re);
    if (m) {
      const raw = m[1].replace(/[()]/g, "").trim();
      return raw.charAt(0).toLocaleUpperCase("tr-TR") + raw.slice(1);
    }
  }
  return null;
}

/** Servis adı gerçekten Türk hedefli mi? */
export function isTurkishService(serviceName: string): boolean {
  return /türk|turk|turkey/i.test(serviceName ?? "");
}

/** Süreyi dakikadan okunur etikete çevirir */
export function formatAvgCompletion(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `~${Math.round(minutes)} dk`;
  const hours = minutes / 60;
  if (hours < 24) return `~${Math.round(hours)} sa`;
  return `~${Math.round(hours / 24)} gün`;
}
